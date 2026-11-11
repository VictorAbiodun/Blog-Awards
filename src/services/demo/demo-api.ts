import { slugify } from "@/lib/format";
import type {
  AdminFundingOverview,
  AdminOverview,
  Artist,
  AuditEntry,
  Category,
  DashboardData,
  Flag,
  FundingConfig,
  FundingRequest,
  FundingRequestStatus,
  LeaderboardRow,
  ManagedUser,
  Payment,
  ReportKind,
  Role,
  Season,
  Session,
  TopUpStart,
  User,
  VoteReceipt,
  WalletData,
  Winner,
} from "@/types/domain";

import { ApiError, type ArtistInput, type BlogAwardApi, type CategoryInput, type SeasonSettingsInput } from "../api";
import type { DemoState, DemoUserRecord } from "./seed";
import { mutate, newId, readState, resetDemoData } from "./store";

/**
 * Demo implementation of the backend contract. Everything lives in the browser
 * (localStorage), so every screen can be clicked through with no server.
 * It also follows the real rules: balances come from the ledger, only a
 * verified payment creates credits, and administrator actions are audited.
 */

let latencyMs = 120;
export function setDemoLatency(ms: number) {
  latencyMs = ms;
}
export { resetDemoData };

const wait = () => (latencyMs > 0 ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve());
const nowIso = () => new Date().toISOString();
const SESSION_HOURS = 8;

function publicUser(record: DemoUserRecord): User {
  const { password, ...user } = record;
  void password;
  return user;
}

function balanceOf(state: DemoState, userId: string): number {
  return state.ledger.filter((entry) => entry.userId === userId).reduce((sum, entry) => sum + entry.amountKobo, 0);
}

function sessionOf(state: DemoState): Session {
  if (!state.session) return { status: "signedOut" };
  if (state.session.expiresAt < Date.now()) return { status: "expired" };
  const record = state.users.find((user) => user.id === state.session!.userId);
  if (!record || record.status === "disabled") return { status: "unavailable" };
  return { status: "signedIn", user: publicUser(record) };
}

function requireUser(state: DemoState): DemoUserRecord {
  const session = sessionOf(state);
  if (session.status === "signedIn") return state.users.find((user) => user.id === session.user.id)!;
  if (session.status === "unavailable") throw new ApiError("account_unavailable", "This account is disabled or has been deleted.");
  if (session.status === "expired") throw new ApiError("not_signed_in", "Your session ended. Please log in again.");
  throw new ApiError("not_signed_in", "Please log in first.");
}

function requireConfirmed(state: DemoState): DemoUserRecord {
  const user = requireUser(state);
  if (!user.emailConfirmed) throw new ApiError("email_not_confirmed", "Confirm your email before funding your wallet or voting.");
  return user;
}

function requireAdmin(state: DemoState): DemoUserRecord {
  const user = requireUser(state);
  if (user.role !== "admin" && user.role !== "super_admin") throw new ApiError("forbidden", "Only administrators can do that.");
  return user;
}

function requireSuperAdmin(state: DemoState): DemoUserRecord {
  const user = requireUser(state);
  if (user.role !== "super_admin") throw new ApiError("forbidden", "Only the Super Administrator can do that.");
  return user;
}

function audit(state: DemoState, action: string, reason?: string) {
  state.audit.unshift({ id: newId("au"), action, actor: "Admin", reason, createdAt: nowIso() });
}

function categoryName(state: DemoState, artist: Artist): string {
  return state.categories.find((category) => category.id === artist.categoryIds[0])?.name ?? "Uncategorised";
}

function uniqueSlug(state: DemoState, name: string, ignoreId?: string): string {
  const base = slugify(name) || "artist";
  let slug = base;
  let n = 2;
  while (state.artists.some((artist) => artist.slug === slug && artist.id !== ignoreId)) slug = `${base}-${n++}`;
  return slug;
}

function leaderFor(state: DemoState, categoryId: string): Artist | undefined {
  return state.artists
    .filter((artist) => artist.status === "published" && artist.categoryIds.includes(categoryId))
    .sort((a, b) => b.votes - a.votes)[0];
}

function csvCell(value: string | number): string {
  let text = String(value);
  // Stop spreadsheet programs from running a cell that starts like a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const csv = (rows: Array<Array<string | number>>) => rows.map((row) => row.map(csvCell).join(",")).join("\n");

export const demoApi: BlogAwardApi = {
  // ---- Accounts -----------------------------------------------------------
  async getSession() {
    await wait();
    return sessionOf(readState());
  },

  async register({ displayName, email, password }) {
    await wait();
    return mutate((state) => {
      const normalised = email.trim().toLowerCase();
      if (state.users.some((user) => user.email === normalised)) {
        throw new ApiError("email_taken", "An account with that email already exists. Try logging in.");
      }
      state.users.push({
        id: newId("u"),
        email: normalised,
        password,
        displayName: displayName.trim(),
        role: "fan",
        emailConfirmed: false,
        status: "active",
        createdAt: nowIso(),
      });
      return { email: normalised };
    });
  },

  async login({ email, password }) {
    await wait();
    return mutate((state) => {
      const record = state.users.find((user) => user.email === email.trim().toLowerCase());
      if (!record || record.password !== password) {
        throw new ApiError("invalid_credentials", "Wrong email or password. Check both and try again.");
      }
      if (record.status === "disabled") throw new ApiError("account_unavailable", "This account is disabled or has been deleted.");
      if (!record.emailConfirmed) {
        throw new ApiError("email_not_confirmed", "Confirm your email first. We sent you a link when you signed up.");
      }
      state.session = { userId: record.id, expiresAt: Date.now() + SESSION_HOURS * 3_600_000 };
      return publicUser(record);
    });
  },

  async logout() {
    await wait();
    mutate((state) => {
      state.session = null;
    });
  },

  async requestPasswordReset() {
    // Always succeeds, so the answer never reveals whether an account exists.
    await wait();
  },

  async completePasswordReset({ newPassword, email }) {
    await wait();
    mutate((state) => {
      const record = state.users.find((user) => user.email === (email ?? "").trim().toLowerCase());
      if (!record) throw new ApiError("validation", "That reset link is not valid any more. Ask for a new one.");
      record.password = newPassword;
    });
  },

  async resendConfirmation() {
    await wait();
  },

  async confirmEmailDemo(email) {
    await wait();
    mutate((state) => {
      const record = state.users.find((user) => user.email === email.trim().toLowerCase());
      if (record) record.emailConfirmed = true;
    });
  },

  async updateProfile({ displayName }) {
    await wait();
    return mutate((state) => {
      const record = requireUser(state);
      record.displayName = displayName.trim();
      return publicUser(record);
    });
  },

  async changePassword({ currentPassword, newPassword }) {
    await wait();
    mutate((state) => {
      const record = requireUser(state);
      if (record.password !== currentPassword) throw new ApiError("validation", "Your current password is not right.");
      record.password = newPassword;
    });
  },

  async deleteAccount() {
    await wait();
    mutate((state) => {
      const record = requireUser(state);
      state.users = state.users.filter((user) => user.id !== record.id);
      state.session = null;
    });
  },

  // ---- Public catalogue ---------------------------------------------------
  async getSeason() {
    await wait();
    return readState().season;
  },

  async listCategories() {
    await wait();
    return readState().categories;
  },

  async listArtists() {
    await wait();
    return readState().artists.filter((artist) => artist.status === "published");
  },

  async getArtist(slug) {
    await wait();
    return readState().artists.find((artist) => artist.slug === slug && artist.status === "published") ?? null;
  },

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    await wait();
    const state = readState();
    return state.artists
      .filter((artist) => artist.status === "published")
      .sort((a, b) => b.votes - a.votes)
      .map((artist) => ({
        artistId: artist.id,
        slug: artist.slug,
        name: artist.name,
        categoryName: categoryName(state, artist),
        votes: artist.votes,
      }));
  },

  async listWinners() {
    await wait();
    return readState().winners.filter((winner) => winner.publishedAt !== null);
  },

  async sendContactMessage() {
    await wait();
    mutate((state) => {
      state.counters.message += 1;
    });
  },

  // ---- Signed-in fan ------------------------------------------------------
  async getDashboard(): Promise<DashboardData> {
    await wait();
    const state = readState();
    const user = requireUser(state);
    const receipts = state.receipts.filter((r) => r.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const votesBy = new Map<string, number>();
    for (const r of receipts) votesBy.set(r.artistId, (votesBy.get(r.artistId) ?? 0) + r.votes);
    const favourites = [...votesBy.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([artistId]) => state.artists.find((artist) => artist.id === artistId))
      .filter((artist): artist is Artist => Boolean(artist));
    return {
      user: publicUser(user),
      balanceKobo: balanceOf(state, user.id),
      balancePoints: balanceOf(state, user.id),
      votesCast: receipts.reduce((sum, r) => sum + r.votes, 0),
      season: state.season,
      transactions: state.ledger.filter((l) => l.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      activity: receipts.slice(0, 3),
      favourites,
      announcements: state.announcements,
    };
  },

  async getWallet(): Promise<WalletData> {
    await wait();
    const state = readState();
    const user = requireUser(state);
    const balance = balanceOf(state, user.id);
    const requests = (state.fundingRequests || []).filter((r) => r.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      balancePoints: balance,
      balanceKobo: balance,
      season: state.season,
      fundingConfig: {
        bankName: "OPay",
        accountName: "Victor Awards Demo OPay",
        accountNumber: "9012345678",
        nairaPerPoint: 50,
        minAmountNaira: 50,
      },
      fundingRequests: requests,
      payments: state.payments.filter((p) => p.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      debits: state.receipts.filter((r) => r.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  },

  async getFundingConfig(): Promise<FundingConfig> {
    await wait();
    return {
      bankName: "OPay",
      accountName: "Victor Awards Demo OPay",
      accountNumber: "9012345678",
      nairaPerPoint: 50,
      minAmountNaira: 50,
    };
  },

  async createFundingRequest(amountNaira: number): Promise<FundingRequest> {
    await wait();
    return mutate((state) => {
      const user = requireConfirmed(state);
      const rate = 50;
      if (!amountNaira || amountNaira < rate || amountNaira % rate !== 0) {
        throw new ApiError("validation", `Amount must be at least ₦${rate} and a multiple of ₦${rate}.`);
      }
      const shortId = user.id.replace(/-/g, "").substring(0, 6).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const reference = `FUND-${shortId}-${randomSuffix}`;
      const expectedPoints = Math.floor(amountNaira / rate);
      const req: FundingRequest = {
        id: newId("fr"),
        reference,
        userId: user.id,
        fanLabel: user.displayName,
        requestedAmountNaira: amountNaira,
        expectedPoints,
        conversionRate: rate,
        status: "awaiting_payment",
        createdAt: nowIso(),
      };
      if (!state.fundingRequests) state.fundingRequests = [];
      state.fundingRequests.unshift(req);
      return req;
    });
  },

  async notifyPaymentMade(reference: string): Promise<FundingRequest> {
    await wait();
    return mutate((state) => {
      const user = requireConfirmed(state);
      if (!state.fundingRequests) state.fundingRequests = [];
      const req = state.fundingRequests.find((r) => r.reference === reference && r.userId === user.id);
      if (!req) throw new ApiError("not_found", "Funding request not found.");
      if (req.status === "approved") throw new ApiError("validation", "This request is already approved.");
      req.status = "pending_verification";
      req.submittedAt = nowIso();
      return req;
    });
  },

  async listMyFundingRequests(): Promise<FundingRequest[]> {
    await wait();
    const state = readState();
    const user = requireUser(state);
    return (state.fundingRequests || []).filter((r) => r.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async startTopUp(amountKobo): Promise<TopUpStart> {
    await wait();
    return mutate((state) => {
      const user = requireConfirmed(state);
      if (!Number.isInteger(amountKobo) || amountKobo < state.season.minTopUpKobo || amountKobo > state.season.maxTopUpKobo) {
        throw new ApiError("amount_out_of_range", "That amount is outside the allowed limits.");
      }
      state.counters.payment += 1;
      const reference = `SAMPLE-T-${String(state.counters.payment).padStart(4, "0")}`;
      state.payments.push({
        id: newId("p"),
        reference,
        userId: user.id,
        fanLabel: `Fan ${user.id.slice(-4)}`,
        amountKobo,
        status: "pending",
        createdAt: nowIso(),
      });
      return { kind: "demo", reference };
    });
  },

  async completeDemoTopUp(reference, outcome) {
    await wait();
    return mutate((state) => {
      const user = requireConfirmed(state);
      const payment = state.payments.find((p) => p.reference === reference && p.userId === user.id);
      if (!payment) throw new ApiError("not_found", "We could not find that payment.");
      if (payment.status !== "pending") return payment; // idempotent: never credit twice
      if (outcome === "failure") {
        payment.status = "failed";
        return payment;
      }
      payment.status = "verified";
      state.ledger.push({
        id: newId("l"),
        userId: user.id,
        type: "top_up",
        amountKobo: payment.amountKobo,
        description: "Wallet top-up",
        relatedId: payment.id,
        createdAt: nowIso(),
      });
      return payment;
    });
  },

  async getPaymentStatus(reference) {
    await wait();
    const state = readState();
    const user = requireUser(state);
    const payment = state.payments.find((p) => p.reference === reference && p.userId === user.id);
    if (!payment) throw new ApiError("not_found", "We could not find that payment.");
    return payment;
  },

  async castVotes({ artistSlug, votes }): Promise<VoteReceipt> {
    await wait();
    return mutate((state) => {
      const user = requireConfirmed(state);
      if (state.season.votingStatus !== "open") throw new ApiError("voting_closed", "Voting for this season has ended.");
      if (!Number.isInteger(votes) || votes < 1 || votes > 100) throw new ApiError("validation", "Choose between 1 and 100 votes.");
      const artist = state.artists.find((a) => a.slug === artistSlug && a.status === "published");
      if (!artist) throw new ApiError("not_found", "We could not find that artist.");
      const category = state.categories.find((c) => artist.categoryIds.includes(c.id) && c.status === "open");
      if (!category) throw new ApiError("voting_closed", "Voting for this artist's category has closed.");

      const total = votes * state.season.votePriceKobo;
      const balance = balanceOf(state, user.id);
      if (balance < total) throw new ApiError("insufficient_credits", "You do not have enough credits for that many votes.");

      state.counters.receipt += 1;
      const receipt: VoteReceipt = {
        id: newId("r"),
        receiptNo: `SAMPLE-V-${String(state.counters.receipt).padStart(4, "0")}`,
        userId: user.id,
        artistId: artist.id,
        artistSlug: artist.slug,
        artistName: artist.name,
        categoryName: category.name,
        votes,
        priceKobo: state.season.votePriceKobo,
        totalKobo: total,
        balanceAfterKobo: balance - total,
        createdAt: nowIso(),
      };
      // The debit and the vote are recorded together, or not at all.
      state.ledger.push({
        id: newId("l"),
        userId: user.id,
        type: "vote_debit",
        amountKobo: -total,
        description: `Votes: ${artist.name}`,
        relatedId: receipt.id,
        createdAt: receipt.createdAt,
      });
      state.receipts.push(receipt);
      artist.votes += votes;
      return receipt;
    });
  },

  async getReceipt(id) {
    await wait();
    const state = readState();
    const user = requireUser(state);
    const receipt = state.receipts.find((r) => r.id === id && r.userId === user.id);
    if (!receipt) throw new ApiError("not_found", "We could not find that receipt.");
    return receipt;
  },

  // ---- Administrator ------------------------------------------------------
  async getAdminOverview(): Promise<AdminOverview> {
    await wait();
    const state = readState();
    requireAdmin(state);
    return {
      verifiedPaymentsKobo: state.payments.filter((p) => p.status === "verified").reduce((sum, p) => sum + p.amountKobo, 0),
      votesCast: state.artists.reduce((sum, a) => sum + a.votes, 0),
      openFlags: state.flags.filter((f) => f.status === "open").length,
      draftArtists: state.artists.filter((a) => a.status === "draft").length,
      pendingPayments: state.payments.filter((p) => p.status === "pending").length,
      recentActions: state.audit.slice(0, 4),
    };
  },

  async getAdminFundingOverview(): Promise<AdminFundingOverview> {
    await wait();
    const state = readState();
    requireAdmin(state);
    const requests = state.fundingRequests || [];
    const approved = requests.filter((r) => r.status === "approved");
    return {
      pendingCount: requests.filter((r) => r.status === "pending_verification").length,
      approvedCount: approved.length,
      rejectedCount: requests.filter((r) => r.status === "rejected").length,
      totalPointsCredited: approved.reduce((sum, r) => sum + (r.creditedPoints || 0), 0),
      totalNairaReceived: approved.reduce((sum, r) => sum + (r.actualAmountNaira || 0), 0),
    };
  },

  async listAdminFundingRequests(filter?: "all" | FundingRequestStatus): Promise<FundingRequest[]> {
    await wait();
    const state = readState();
    requireAdmin(state);
    const requests = state.fundingRequests || [];
    if (!filter || filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  },

  async approveFundingRequest(input: { requestId: string; actualAmountNaira: number }): Promise<FundingRequest> {
    await wait();
    return mutate((state) => {
      const admin = requireAdmin(state);
      const requests = state.fundingRequests || [];
      const req = requests.find((r) => r.id === input.requestId);
      if (!req) throw new ApiError("not_found", "Funding request not found.");
      if (req.status === "approved") throw new ApiError("validation", "This request is already approved.");
      const points = Math.floor(input.actualAmountNaira / (req.conversionRate || 50));
      if (points <= 0) throw new ApiError("validation", "Received amount corresponds to 0 points.");
      req.status = "approved";
      req.actualAmountNaira = input.actualAmountNaira;
      req.creditedPoints = points;
      req.approvedAt = nowIso();
      req.approvedBy = admin.id;

      // Credit ledger
      state.ledger.unshift({
        id: newId("lg"),
        userId: req.userId,
        type: "top_up",
        amountKobo: points,
        relatedId: req.reference,
        description: `OPay Wallet Funding (${points} points)`,
        createdAt: nowIso(),
      });

      audit(state, `Approved funding ${req.reference} (${points} points credited)`);
      return req;
    });
  },

  async rejectFundingRequest(input: { requestId: string; reason: string }): Promise<FundingRequest> {
    await wait();
    return mutate((state) => {
      const admin = requireAdmin(state);
      const requests = state.fundingRequests || [];
      const req = requests.find((r) => r.id === input.requestId);
      if (!req) throw new ApiError("not_found", "Funding request not found.");
      if (req.status === "approved") throw new ApiError("validation", "Approved request cannot be rejected.");
      req.status = "rejected";
      req.rejectionReason = input.reason;
      req.approvedAt = nowIso();
      req.approvedBy = admin.id;

      audit(state, `Rejected funding ${req.reference}: ${input.reason}`);
      return req;
    });
  },

  async listAdminArtists() {
    await wait();
    const state = readState();
    requireAdmin(state);
    return state.artists;
  },

  async uploadArtistImage(file: File): Promise<string> {
    await wait();
    const state = readState();
    requireAdmin(state);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError("unknown", "Failed to read demo image file."));
      reader.readAsDataURL(file);
    });
  },

  async saveArtist(input: ArtistInput) {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      const existing = input.id ? state.artists.find((a) => a.id === input.id) : undefined;
      if (input.id && !existing) throw new ApiError("not_found", "We could not find that artist.");
      if (existing) {
        const wasDraft = existing.status === "draft";
        Object.assign(existing, {
          name: input.name.trim(),
          bio: input.bio.trim(),
          categoryIds: input.categoryIds,
          musicUrl: input.musicUrl.trim(),
          socialUrl: input.socialUrl.trim(),
          imageUrl: input.imageUrl ?? existing.imageUrl,
          status: input.status,
        });
        audit(state, input.status === "published" && wasDraft ? `Published ${existing.name}` : `Updated ${existing.name}`);
        return existing;
      }
      const artist: Artist = {
        id: newId("a"),
        slug: uniqueSlug(state, input.name),
        name: input.name.trim(),
        bio: input.bio.trim(),
        categoryIds: input.categoryIds,
        musicUrl: input.musicUrl.trim(),
        socialUrl: input.socialUrl.trim(),
        imageUrl: input.imageUrl,
        status: input.status,
        votes: 0,
      };
      state.artists.push(artist);
      audit(state, input.status === "published" ? `Published ${artist.name}` : `Saved draft ${artist.name}`);
      return artist;
    });
  },

  async getAdminSeason() {
    await wait();
    const state = readState();
    requireAdmin(state);
    return { season: state.season, categories: state.categories };
  },

  async saveSeasonSettings(input: SeasonSettingsInput): Promise<Season> {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      const { votePriceKobo, minTopUpKobo, maxTopUpKobo } = input;
      if (![votePriceKobo, minTopUpKobo, maxTopUpKobo].every((n) => Number.isInteger(n) && n > 0)) {
        throw new ApiError("validation", "Prices and limits must be whole amounts above zero.");
      }
      if (minTopUpKobo > maxTopUpKobo) throw new ApiError("validation", "The minimum top-up cannot be more than the maximum.");
      if (input.votingOpensAt && input.votingClosesAt && input.votingOpensAt >= input.votingClosesAt) {
        throw new ApiError("validation", "Voting must close after it opens.");
      }
      if (votePriceKobo !== state.season.votePriceKobo) state.season.rulesVersion += 1;
      Object.assign(state.season, { votePriceKobo, minTopUpKobo, maxTopUpKobo, votingOpensAt: input.votingOpensAt, votingClosesAt: input.votingClosesAt });
      audit(state, `Voting rules updated (version ${state.season.rulesVersion})`);
      return state.season;
    });
  },

  async setVotingStatus(status) {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      state.season.votingStatus = status;
      audit(state, status === "open" ? "Voting opened" : "Voting closed");
      return state.season;
    });
  },

  async addCategory(input: CategoryInput): Promise<Category> {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      const category: Category = { id: newId("c"), name: input.name.trim(), description: input.description.trim(), eligibility: input.eligibility.trim(), status: "open" };
      state.categories.push(category);
      audit(state, `Created category ${category.name}`);
      return category;
    });
  },

  async setCategoryStatus(categoryId, status) {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      const category = state.categories.find((c) => c.id === categoryId);
      if (!category) throw new ApiError("not_found", "We could not find that category.");
      category.status = status;
      audit(state, `${status === "open" ? "Opened" : "Closed"} category ${category.name}`);
      return category;
    });
  },

  async listAdminPayments() {
    await wait();
    const state = readState();
    requireAdmin(state);
    return [...state.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async issueRefund({ paymentId, reason }): Promise<Payment> {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      if (reason.trim().length < 10) throw new ApiError("validation", "Explain why in at least 10 characters.");
      const payment = state.payments.find((p) => p.id === paymentId);
      if (!payment) throw new ApiError("not_found", "We could not find that payment.");
      if (payment.status !== "verified") throw new ApiError("validation", "Only verified payments can be refunded.");
      const owner = state.users.find((u) => u.id === payment.userId);
      if (owner) {
        if (balanceOf(state, owner.id) < payment.amountKobo) {
          throw new ApiError("validation", "The fan has already spent these credits, so they cannot be refunded in full.");
        }
        state.ledger.push({
          id: newId("l"),
          userId: owner.id,
          type: "refund",
          amountKobo: -payment.amountKobo,
          description: `Refund of ${payment.reference}`,
          relatedId: payment.id,
          createdAt: nowIso(),
        });
      }
      payment.status = "refunded";
      audit(state, `Refund approved for ${payment.reference}`, reason.trim());
      return payment;
    });
  },

  async listFlags() {
    await wait();
    const state = readState();
    requireAdmin(state);
    return state.flags;
  },

  async reviewFlag(flagId): Promise<Flag> {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      const flag = state.flags.find((f) => f.id === flagId);
      if (!flag) throw new ApiError("not_found", "We could not find that flag.");
      flag.status = "reviewed";
      audit(state, `Reviewed flag: ${flag.subject}`);
      return flag;
    });
  },

  async listAudit(): Promise<AuditEntry[]> {
    await wait();
    const state = readState();
    requireAdmin(state);
    return state.audit;
  },

  async listAdminWinners(): Promise<Winner[]> {
    await wait();
    const state = readState();
    requireAdmin(state);
    return state.categories.map((category) => {
      const leader = leaderFor(state, category.id);
      const published = state.winners.find((w) => w.categoryId === category.id && w.publishedAt);
      return {
        categoryId: category.id,
        categoryName: category.name,
        artistName: published?.artistName ?? leader?.name ?? "No artists yet",
        votes: published?.votes ?? leader?.votes ?? 0,
        publishedAt: published?.publishedAt ?? null,
      };
    });
  },

  async publishWinner(categoryId): Promise<Winner> {
    await wait();
    return mutate((state) => {
      requireAdmin(state);
      if (state.season.votingStatus !== "closed") {
        throw new ApiError("validation", "Winners can be published only after voting closes.");
      }
      const category = state.categories.find((c) => c.id === categoryId);
      const leader = leaderFor(state, categoryId);
      if (!category || !leader) throw new ApiError("not_found", "There is no artist to publish for that category.");
      const winner: Winner = { categoryId, categoryName: category.name, artistName: leader.name, votes: leader.votes, publishedAt: nowIso() };
      state.winners = [...state.winners.filter((w) => w.categoryId !== categoryId), winner];
      audit(state, `Published winner for ${category.name}: ${leader.name}`);
      return winner;
    });
  },

  async exportReport(kind: ReportKind) {
    await wait();
    const state = readState();
    requireAdmin(state);
    if (kind === "payments") {
      return csv([["reference", "fan", "amount_naira", "status", "created_at"], ...state.payments.map((p) => [p.reference, p.fanLabel, p.amountKobo / 100, p.status, p.createdAt])]);
    }
    if (kind === "votes") {
      return csv([["receipt", "artist", "category", "votes", "total_naira", "created_at"], ...state.receipts.map((r) => [r.receiptNo, r.artistName, r.categoryName, r.votes, r.totalKobo / 100, r.createdAt])]);
    }
    return csv([["action", "actor", "reason", "created_at"], ...state.audit.map((a) => [a.action, a.actor, a.reason ?? "", a.createdAt])]);
  },

  async listAdminUsers(): Promise<ManagedUser[]> {
    await wait();
    const state = readState();
    requireAdmin(state);
    return state.users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
    }));
  },

  async setUserRole({ targetUserId, role }: { targetUserId: string; role: "fan" | "admin" }): Promise<{ userId: string; role: Role }> {
    await wait();
    return mutate((state) => {
      requireSuperAdmin(state);
      const target = state.users.find((u) => u.id === targetUserId);
      if (!target) throw new ApiError("not_found", "User not found.");
      if (target.role === "super_admin") {
        throw new ApiError("forbidden", "The Super Administrator role cannot be altered.");
      }
      target.role = role;
      audit(state, `${role === "admin" ? "Promoted" : "Demoted"} user ${target.email} to ${role}`);
      return { userId: target.id, role: target.role };
    });
  },
};

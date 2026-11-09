import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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

import {
  ApiError,
  type ArtistInput,
  type BlogAwardApi,
  type CategoryInput,
  type ContactInput,
  type SeasonSettingsInput,
} from "./api";

function client() {
  return createSupabaseBrowserClient();
}

async function handleApiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const supabase = client();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (res.statusText ? `${res.status} ${res.statusText}` : `Server error (${res.status})`);
    const code =
      res.status === 401
        ? "not_signed_in"
        : res.status === 403
          ? "forbidden"
          : res.status === 404
            ? "not_found"
            : res.status === 400
              ? "validation"
              : "unknown";
    throw new ApiError(code, errorMsg);
  }
  return data as T;
}

export const backendApi: BlogAwardApi = {
  // ---- Accounts -----------------------------------------------------------
  async getSession(): Promise<Session> {
    const supabase = client();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return { status: "signedOut" };
    }

    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("display_name, account_status").eq("id", authUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle(),
    ]);

    if (profile?.account_status === "disabled") {
      return { status: "unavailable" };
    }

    const user: User = {
      id: authUser.id,
      email: authUser.email ?? "",
      displayName: profile?.display_name ?? authUser.user_metadata?.display_name ?? "Fan",
      role: (roleRow?.role as Role) ?? "fan",
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      status: (profile?.account_status as "active" | "disabled") ?? "active",
      createdAt: authUser.created_at,
    };

    return { status: "signedIn", user };
  },

  async register({ displayName, email, password }) {
    const supabase = client();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("taken")) {
        throw new ApiError("email_taken", "An account with that email already exists.");
      }
      throw new ApiError("validation", error.message);
    }

    return { email: data.user?.email ?? email };
  },

  async login({ email, password }) {
    const supabase = client();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new ApiError("email_not_confirmed", "Confirm your email before you log in.");
      }
      throw new ApiError("invalid_credentials", "Wrong email or password.");
    }

    const authUser = data.user;
    if (!authUser) throw new ApiError("invalid_credentials", "Wrong email or password.");

    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("display_name, account_status").eq("id", authUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle(),
    ]);

    if (profile?.account_status === "disabled") {
      await supabase.auth.signOut();
      throw new ApiError("account_unavailable", "This account has been disabled.");
    }

    return {
      id: authUser.id,
      email: authUser.email ?? email,
      displayName: profile?.display_name ?? authUser.user_metadata?.display_name ?? "Fan",
      role: (roleRow?.role as Role) ?? "fan",
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      status: "active",
      createdAt: authUser.created_at,
    };
  },

  async logout() {
    const supabase = client();
    await supabase.auth.signOut();
  },

  async requestPasswordReset(email: string) {
    const supabase = client();
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
  },

  async completePasswordReset({ newPassword }) {
    const supabase = client();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new ApiError("validation", error.message);
    }
  },

  async resendConfirmation(email: string) {
    const supabase = client();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      throw new ApiError("validation", error.message);
    }
  },

  async updateProfile({ displayName }) {
    const supabase = client();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError("not_signed_in", "You must be signed in.");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", authUser.id);

    if (error) throw new ApiError("validation", error.message);

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle();

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      displayName: displayName.trim(),
      role: (roleRow?.role as Role) ?? "fan",
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      status: "active",
      createdAt: authUser.created_at,
    };
  },

  async changePassword({ currentPassword, newPassword }) {
    const supabase = client();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) throw new ApiError("not_signed_in", "You must be signed in.");

    // Verify current password first
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) throw new ApiError("invalid_credentials", "The current password you entered is incorrect.");

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) throw new ApiError("validation", updateErr.message);
  },

  async deleteAccount() {
    await handleApiFetch("/api/auth/delete-account", { method: "POST" });
    const supabase = client();
    await supabase.auth.signOut();
  },

  // ---- Public catalogue ---------------------------------------------------
  async getSeason(): Promise<Season> {
    const supabase = client();
    const { data, error } = await supabase.from("seasons").select("*").eq("is_current", true).single();
    if (error || !data) {
      throw new ApiError("not_found", "Current season not found.");
    }
    return {
      id: data.id,
      name: data.name,
      votingStatus: data.voting_status,
      votePriceKobo: data.vote_price_kobo,
      minTopUpKobo: data.min_top_up_kobo,
      maxTopUpKobo: data.max_top_up_kobo,
      rulesVersion: data.rules_version,
      votingOpensAt: data.voting_opens_at,
      votingClosesAt: data.voting_closes_at,
      showVoteCounts: data.show_vote_counts,
    };
  },

  async listCategories(): Promise<Category[]> {
    const supabase = client();
    const { data, error } = await supabase.from("categories").select("*").order("display_order");
    if (error) throw new ApiError("unknown", error.message);
    return (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      eligibility: c.eligibility,
      status: c.status,
    }));
  },

  async listArtists(): Promise<Artist[]> {
    const supabase = client();
    const { data, error } = await supabase
      .from("artists")
      .select("*, artist_categories(category_id)")
      .eq("status", "published")
      .order("name");

    if (error) throw new ApiError("unknown", error.message);
    return (data ?? []).map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      bio: a.bio,
      categoryIds: (a.artist_categories ?? []).map((ac: { category_id: string }) => ac.category_id),
      musicUrl: a.music_url ?? "",
      socialUrl: a.social_url ?? "",
      imageUrl: a.image_path ?? undefined,
      status: a.status,
      votes: a.votes ?? 0,
    }));
  },

  async getArtist(slug: string): Promise<Artist | null> {
    const supabase = client();
    const { data, error } = await supabase
      .from("artists")
      .select("*, artist_categories(category_id)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      bio: data.bio,
      categoryIds: (data.artist_categories ?? []).map((ac: { category_id: string }) => ac.category_id),
      musicUrl: data.music_url ?? "",
      socialUrl: data.social_url ?? "",
      imageUrl: data.image_path ?? undefined,
      status: data.status,
      votes: data.votes ?? 0,
    };
  },

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    const supabase = client();
    const { data, error } = await supabase
      .from("artists")
      .select("id, name, slug, votes, artist_categories(categories(name))")
      .eq("status", "published")
      .order("votes", { ascending: false });

    if (error) throw new ApiError("unknown", error.message);

    return (data ?? []).map((a) => {
      const categoryName = (a.artist_categories?.[0] as { categories?: { name?: string } } | undefined)?.categories?.name ?? "Nominee";
      return {
        artistId: a.id,
        slug: a.slug,
        name: a.name,
        categoryName,
        votes: a.votes ?? 0,
      };
    });
  },

  async listWinners(): Promise<Winner[]> {
    const supabase = client();
    const { data, error } = await supabase
      .from("winners")
      .select("*, categories(name), artists(name, slug, votes)")
      .not("published_at", "is", null);

    if (error) throw new ApiError("unknown", error.message);
    return (data ?? []).map((w) => ({
      categoryId: w.category_id,
      categoryName: w.categories?.name ?? "Category",
      artistId: w.artist_id,
      artistSlug: w.artists?.slug ?? "nominee",
      artistName: w.artists?.name ?? "Nominee",
      votes: w.artists?.votes ?? 0,
      publishedAt: w.published_at,
    }));
  },

  async sendContactMessage(input: ContactInput) {
    void input;
    // Contact messages can be stored or sent via server handler
    await new Promise((resolve) => setTimeout(resolve, 300));
  },

  // ---- Signed-in fan ------------------------------------------------------
  async getDashboard(): Promise<DashboardData> {
    const supabase = client();
    const sessionRes = await this.getSession();
    if (sessionRes.status !== "signedIn") throw new ApiError("not_signed_in", "You must be signed in.");
    const user = sessionRes.user;

    const [season, { data: balanceData }, { data: receipts }, { data: ledgerRows }, { data: announcements }] = await Promise.all([
      this.getSeason(),
      supabase.rpc("get_wallet_balance", { p_user_id: user.id }),
      supabase.from("votes").select("*, artists(name, slug), categories(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("announcements").select("*").not("published_at", "is", null).order("published_at", { ascending: false }).limit(3),
    ]);

    const formattedReceipts: VoteReceipt[] = (receipts ?? []).map((r) => ({
      id: r.id,
      receiptNo: r.receipt_no,
      userId: r.user_id,
      artistId: r.artist_id,
      artistSlug: r.artists?.slug ?? "",
      artistName: r.artists?.name ?? "",
      categoryName: r.categories?.name ?? "",
      votes: r.votes,
      priceKobo: r.price_kobo,
      totalKobo: r.total_kobo,
      balanceAfterKobo: 0,
      createdAt: r.created_at,
    }));

    const votesCast = formattedReceipts.reduce((sum, r) => sum + r.votes, 0);

    return {
      user,
      balanceKobo: typeof balanceData === "number" ? balanceData : 0,
      votesCast,
      season,
      transactions: (ledgerRows ?? []).map((l) => ({
        id: l.id,
        userId: l.user_id,
        type: l.entry_type,
        amountKobo: l.amount_kobo,
        description: l.description,
        relatedId: l.related_id ?? undefined,
        createdAt: l.created_at,
      })),
      activity: formattedReceipts.slice(0, 3),
      favourites: [],
      announcements: (announcements ?? []).map((a) => ({
        id: a.id,
        text: a.body,
      })),
    };
  },

  async getWallet(): Promise<WalletData> {
    const supabase = client();
    const sessionRes = await this.getSession();
    if (sessionRes.status !== "signedIn") throw new ApiError("not_signed_in", "You must be signed in.");
    const user = sessionRes.user;

    const [season, { data: balanceData }, { data: payments }, { data: receipts }, fundingConfig, fundingRequests] = await Promise.all([
      this.getSeason(),
      supabase.rpc("get_wallet_balance", { p_user_id: user.id }),
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("votes").select("*, artists(name, slug), categories(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      this.getFundingConfig().catch(() => ({
        bankName: "OPay",
        accountName: "Blog Award Foundation",
        accountNumber: "9012345678",
        nairaPerPoint: 50,
        minAmountNaira: 50,
      })),
      this.listMyFundingRequests().catch(() => []),
    ]);

    const points = typeof balanceData === "number" ? balanceData : 0;

    return {
      balancePoints: points,
      balanceKobo: points,
      season,
      fundingConfig,
      fundingRequests,
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        reference: p.reference,
        userId: p.user_id,
        fanLabel: user.displayName,
        amountKobo: p.amount_kobo,
        status: p.status,
        createdAt: p.created_at,
      })),
      debits: (receipts ?? []).map((r) => ({
        id: r.id,
        receiptNo: r.receipt_no,
        userId: r.user_id,
        artistId: r.artist_id,
        artistSlug: r.artists?.slug ?? "",
        artistName: r.artists?.name ?? "",
        categoryName: r.categories?.name ?? "",
        votes: r.votes,
        priceKobo: r.price_kobo,
        totalKobo: r.total_kobo,
        balanceAfterKobo: 0,
        createdAt: r.created_at,
      })),
    };
  },

  async getFundingConfig(): Promise<FundingConfig> {
    return handleApiFetch<FundingConfig>("/api/wallet/config");
  },

  async createFundingRequest(amountNaira: number): Promise<FundingRequest> {
    return handleApiFetch<FundingRequest>("/api/wallet/funding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNaira }),
    });
  },

  async notifyPaymentMade(reference: string): Promise<FundingRequest> {
    return handleApiFetch<FundingRequest>("/api/wallet/funding/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
  },

  async listMyFundingRequests(): Promise<FundingRequest[]> {
    return handleApiFetch<FundingRequest[]>("/api/wallet/funding");
  },

  async startTopUp(amountKobo: number): Promise<TopUpStart> {
    return handleApiFetch<TopUpStart>("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKobo }),
    });
  },

  async getPaymentStatus(reference: string): Promise<Payment> {
    const supabase = client();
    const { data, error } = await supabase.from("payments").select("*, profiles:user_id(display_name)").eq("reference", reference).single();
    if (error || !data) throw new ApiError("not_found", "Payment not found.");
    return {
      id: data.id,
      reference: data.reference,
      userId: data.user_id,
      fanLabel: data.profiles?.display_name ?? "Fan",
      amountKobo: data.amount_kobo,
      status: data.status,
      createdAt: data.created_at,
    };
  },

  async castVotes({ artistSlug, votes }): Promise<VoteReceipt> {
    const supabase = client();
    const { data, error } = await supabase.rpc("cast_votes", {
      p_artist_slug: artistSlug,
      p_votes: votes,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("enough credits") || error.code === "P0009") {
        throw new ApiError("insufficient_credits", "You do not have enough credits for that many votes.");
      }
      if (msg.includes("season has ended") || msg.includes("category has closed") || error.code === "P0005" || error.code === "P0007") {
        throw new ApiError("voting_closed", error.message);
      }
      if (msg.includes("logged in") || error.code === "P0001") {
        throw new ApiError("not_signed_in", "You must be logged in to vote.");
      }
      if (msg.includes("confirm your email") || error.code === "P0003") {
        throw new ApiError("email_not_confirmed", "Confirm your email before you vote.");
      }
      if (msg.includes("account is unavailable") || error.code === "P0004") {
        throw new ApiError("account_unavailable", "This account is unavailable.");
      }
      throw new ApiError("validation", error.message);
    }

    return data as VoteReceipt;
  },

  async getReceipt(id: string): Promise<VoteReceipt> {
    const supabase = client();
    const { data, error } = await supabase
      .from("votes")
      .select("*, artists(name, slug), categories(name)")
      .eq("id", id)
      .single();

    if (error || !data) throw new ApiError("not_found", "Receipt not found.");

    return {
      id: data.id,
      receiptNo: data.receipt_no,
      userId: data.user_id,
      artistId: data.artist_id,
      artistSlug: data.artists?.slug ?? "",
      artistName: data.artists?.name ?? "",
      categoryName: data.categories?.name ?? "",
      votes: data.votes,
      priceKobo: data.price_kobo,
      totalKobo: data.total_kobo,
      balanceAfterKobo: 0,
      createdAt: data.created_at,
    };
  },

  // ---- Administrator ------------------------------------------------------
  async getAdminOverview(): Promise<AdminOverview> {
    return handleApiFetch<AdminOverview>("/api/admin/overview");
  },

  async getAdminFundingOverview(): Promise<AdminFundingOverview> {
    return handleApiFetch<AdminFundingOverview>("/api/admin/funding/overview");
  },

  async listAdminFundingRequests(filter?: "all" | FundingRequestStatus): Promise<FundingRequest[]> {
    const url = filter && filter !== "all" ? `/api/admin/funding/requests?filter=${filter}` : "/api/admin/funding/requests";
    return handleApiFetch<FundingRequest[]>(url);
  },

  async approveFundingRequest(input: { requestId: string; actualAmountNaira: number }): Promise<FundingRequest> {
    return handleApiFetch<FundingRequest>("/api/admin/funding/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async rejectFundingRequest(input: { requestId: string; reason: string }): Promise<FundingRequest> {
    return handleApiFetch<FundingRequest>("/api/admin/funding/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async listAdminArtists(): Promise<Artist[]> {
    return handleApiFetch<Artist[]>("/api/admin/artists");
  },

  async saveArtist(input: ArtistInput): Promise<Artist> {
    return handleApiFetch<Artist>("/api/admin/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async getAdminSeason(): Promise<{ season: Season; categories: Category[] }> {
    return handleApiFetch<{ season: Season; categories: Category[] }>("/api/admin/season");
  },

  async saveSeasonSettings(input: SeasonSettingsInput): Promise<Season> {
    return handleApiFetch<Season>("/api/admin/season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async setVotingStatus(status: "open" | "closed"): Promise<Season> {
    return handleApiFetch<Season>("/api/admin/season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "set_voting_status", status }),
    });
  },

  async addCategory(input: CategoryInput): Promise<Category> {
    return handleApiFetch<Category>("/api/admin/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async setCategoryStatus(categoryId: string, status: "open" | "closed"): Promise<Category> {
    return handleApiFetch<Category>("/api/admin/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "set_status", categoryId, status }),
    });
  },

  async listAdminPayments(): Promise<Payment[]> {
    return handleApiFetch<Payment[]>("/api/admin/payments");
  },

  async issueRefund(input: { paymentId: string; reason: string }): Promise<Payment> {
    return handleApiFetch<Payment>("/api/admin/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async listFlags(): Promise<Flag[]> {
    return handleApiFetch<Flag[]>("/api/admin/flags");
  },

  async reviewFlag(flagId: string): Promise<Flag> {
    return handleApiFetch<Flag>("/api/admin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagId }),
    });
  },

  async listAudit(): Promise<AuditEntry[]> {
    return handleApiFetch<AuditEntry[]>("/api/admin/audit");
  },

  async listAdminWinners(): Promise<Winner[]> {
    return handleApiFetch<Winner[]>("/api/admin/winners");
  },

  async publishWinner(categoryId: string): Promise<Winner> {
    return handleApiFetch<Winner>("/api/admin/winners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
  },

  async exportReport(kind: ReportKind): Promise<string> {
    const res = await fetch(`/api/admin/report?kind=${encodeURIComponent(kind)}`);
    if (!res.ok) throw new ApiError("unknown", "Failed to export report.");
    return res.text();
  },

  async listAdminUsers(): Promise<ManagedUser[]> {
    return handleApiFetch<ManagedUser[]>("/api/admin/users");
  },

  async setUserRole(input: { targetUserId: string; role: "fan" | "admin" }): Promise<{ userId: string; role: Role }> {
    return handleApiFetch<{ userId: string; role: Role }>("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};

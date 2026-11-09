import type {
  AdminOverview,
  Artist,
  AuditEntry,
  Category,
  DashboardData,
  Flag,
  LeaderboardRow,
  Payment,
  ReportKind,
  Season,
  Session,
  TopUpStart,
  User,
  VoteReceipt,
  WalletData,
  Winner,
} from "@/types/domain";

/**
 * Every way a call can fail, so the interface can show a helpful message
 * without knowing anything about the backend.
 */
export type ApiErrorCode =
  | "not_signed_in"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "insufficient_credits"
  | "voting_closed"
  | "account_unavailable"
  | "amount_out_of_range"
  | "forbidden"
  | "not_found"
  | "validation"
  | "backend_not_connected"
  | "unknown";

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export interface ArtistInput {
  /** Present when editing an existing artist. */
  id?: string;
  name: string;
  bio: string;
  categoryIds: string[];
  musicUrl: string;
  socialUrl: string;
  imageUrl?: string;
  status: "draft" | "published";
}

export interface SeasonSettingsInput {
  votePriceKobo: number;
  minTopUpKobo: number;
  maxTopUpKobo: number;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
}

export interface CategoryInput {
  name: string;
  description: string;
  eligibility: string;
}

export interface ContactInput {
  name: string;
  email: string;
  subject: "general" | "suggest-artist" | "account" | "payment";
  message: string;
}

/**
 * THE CONTRACT between the interface and the backend.
 *
 * - `src/services/demo/demo-api.ts` implements it with fake in-browser data.
 * - `src/services/backend-api.ts` is where you implement it with Supabase.
 *
 * Rules every real implementation must follow (see docs/BACKEND-HANDOFF.md):
 * the server re-checks permissions, money is integer kobo, balances come from
 * the ledger, and only verified payments create credits.
 */
export interface BlogAwardApi {
  // ---- Accounts -----------------------------------------------------------
  getSession(): Promise<Session>;
  register(input: { displayName: string; email: string; password: string }): Promise<{ email: string }>;
  login(input: { email: string; password: string }): Promise<User>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /**
   * Sets a new password after the person followed the reset link in their email.
   * A real backend identifies them from the recovery session the link creates.
   * `email` is only used by demo mode, which has no email link.
   */
  completePasswordReset(input: { newPassword: string; email?: string }): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  /** Demo only: stands in for clicking the link in the confirmation email. */
  confirmEmailDemo?(email: string): Promise<void>;
  updateProfile(input: { displayName: string }): Promise<User>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  deleteAccount(): Promise<void>;

  // ---- Public catalogue ---------------------------------------------------
  getSeason(): Promise<Season>;
  listCategories(): Promise<Category[]>;
  /** Published artists only. */
  listArtists(): Promise<Artist[]>;
  getArtist(slug: string): Promise<Artist | null>;
  getLeaderboard(): Promise<LeaderboardRow[]>;
  /** Published winners only. */
  listWinners(): Promise<Winner[]>;
  sendContactMessage(input: ContactInput): Promise<void>;

  // ---- Signed-in fan ------------------------------------------------------
  getDashboard(): Promise<DashboardData>;
  getWallet(): Promise<WalletData>;
  /**
   * Starts a wallet top-up. A real backend creates a pending payment and returns
   * the provider checkout URL. A browser redirect is never proof of payment.
   */
  startTopUp(amountKobo: number): Promise<TopUpStart>;
  /** Demo only: stands in for finishing the provider checkout. */
  completeDemoTopUp?(reference: string, outcome: "success" | "failure"): Promise<Payment>;
  getPaymentStatus(reference: string): Promise<Payment>;
  castVotes(input: { artistSlug: string; votes: number }): Promise<VoteReceipt>;
  getReceipt(id: string): Promise<VoteReceipt>;

  // ---- Administrator ------------------------------------------------------
  getAdminOverview(): Promise<AdminOverview>;
  listAdminArtists(): Promise<Artist[]>;
  saveArtist(input: ArtistInput): Promise<Artist>;
  getAdminSeason(): Promise<{ season: Season; categories: Category[] }>;
  saveSeasonSettings(input: SeasonSettingsInput): Promise<Season>;
  setVotingStatus(status: "open" | "closed"): Promise<Season>;
  addCategory(input: CategoryInput): Promise<Category>;
  setCategoryStatus(categoryId: string, status: "open" | "closed"): Promise<Category>;
  listAdminPayments(): Promise<Payment[]>;
  issueRefund(input: { paymentId: string; reason: string }): Promise<Payment>;
  listFlags(): Promise<Flag[]>;
  reviewFlag(flagId: string): Promise<Flag>;
  listAudit(): Promise<AuditEntry[]>;
  listAdminWinners(): Promise<Winner[]>;
  publishWinner(categoryId: string): Promise<Winner>;
  /** Returns CSV text. Must never include passwords, secret keys or card data. */
  exportReport(kind: ReportKind): Promise<string>;
}

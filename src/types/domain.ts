/**
 * The shapes of the data the interface works with.
 * Money is ALWAYS integer kobo (100 kobo = NGN 1). Never floating point.
 */

export type Role = "fan" | "admin" | "super_admin";
export type AccountStatus = "active" | "disabled";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailConfirmed: boolean;
  status: AccountStatus;
  createdAt: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export type Session =
  | { status: "signedOut" }
  | { status: "expired" }
  | { status: "unavailable" }
  | { status: "signedIn"; user: User };

export interface Category {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  status: "open" | "closed";
}

export type ArtistStatus = "draft" | "published";

export interface Artist {
  id: string;
  slug: string;
  name: string;
  bio: string;
  categoryIds: string[];
  musicUrl: string;
  socialUrl: string;
  /** Optional image, only ever supplied by an administrator. */
  imageUrl?: string;
  status: ArtistStatus;
  votes: number;
}

export interface Season {
  id: string;
  name: string;
  votingStatus: "open" | "closed";
  votePriceKobo: number;
  minTopUpKobo: number;
  maxTopUpKobo: number;
  rulesVersion: number;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  showVoteCounts: boolean;
}

export type LedgerType = "top_up" | "vote_debit" | "refund" | "adjustment";

export interface LedgerEntry {
  id: string;
  userId: string;
  type: LedgerType;
  /** Signed: credits are positive, debits negative. */
  amountKobo: number;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export type PaymentStatus = "pending" | "verified" | "failed" | "refunded";

export interface Payment {
  id: string;
  reference: string;
  userId: string;
  fanLabel: string;
  amountKobo: number;
  status: PaymentStatus;
  createdAt: string;
}

export type FundingRequestStatus =
  | "awaiting_payment"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "expired";

export interface FundingRequest {
  id: string;
  reference: string;
  userId: string;
  fanLabel: string;
  requestedAmountNaira: number;
  actualAmountNaira?: number;
  expectedPoints: number;
  creditedPoints?: number;
  conversionRate: number;
  status: FundingRequestStatus;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface FundingConfig {
  bankName: string;
  accountName: string;
  accountNumber: string;
  nairaPerPoint: number;
  minAmountNaira: number;
}

export interface VoteReceipt {
  id: string;
  receiptNo: string;
  userId: string;
  artistId: string;
  artistSlug: string;
  artistName: string;
  categoryName: string;
  votes: number;
  priceKobo: number;
  totalKobo: number;
  balanceAfterKobo: number;
  createdAt: string;
}

export interface Flag {
  id: string;
  subject: string;
  detail: string;
  status: "open" | "reviewed";
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  reason?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  text: string;
}

export interface LeaderboardRow {
  artistId: string;
  slug: string;
  name: string;
  categoryName: string;
  votes: number;
}

export interface Winner {
  categoryId: string;
  categoryName: string;
  artistName: string;
  votes: number;
  publishedAt: string | null;
}

export interface DashboardData {
  user: User;
  balanceKobo: number;
  votesCast: number;
  season: Season;
  transactions: LedgerEntry[];
  activity: VoteReceipt[];
  favourites: Artist[];
  announcements: Announcement[];
}

export interface WalletData {
  balancePoints?: number;
  balanceKobo: number;
  season: Season;
  fundingConfig?: FundingConfig;
  fundingRequests?: FundingRequest[];
  payments: Payment[];
  debits: VoteReceipt[];
}

export interface AdminFundingOverview {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPointsCredited: number;
  totalNairaReceived: number;
}

export interface AdminOverview {
  verifiedPaymentsKobo: number;
  votesCast: number;
  openFlags: number;
  draftArtists: number;
  pendingPayments: number;
  recentActions: AuditEntry[];
}

export type TopUpStart =
  | { kind: "redirect"; reference: string; url: string }
  | { kind: "demo"; reference: string };

export type ReportKind = "payments" | "votes" | "audit";

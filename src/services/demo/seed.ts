import type {
  Announcement,
  Artist,
  AuditEntry,
  Category,
  Flag,
  LedgerEntry,
  Payment,
  Season,
  VoteReceipt,
  Winner,
} from "@/types/domain";

export interface DemoUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: "fan" | "admin";
  emailConfirmed: boolean;
  status: "active" | "disabled";
  createdAt: string;
  /** Plain text on purpose: this is fake data for demo mode only. */
  password: string;
}

export interface DemoState {
  version: 1;
  users: DemoUserRecord[];
  session: { userId: string; expiresAt: number } | null;
  artists: Artist[];
  categories: Category[];
  season: Season;
  ledger: LedgerEntry[];
  payments: Payment[];
  receipts: VoteReceipt[];
  flags: Flag[];
  audit: AuditEntry[];
  winners: Winner[];
  announcements: Announcement[];
  counters: { receipt: number; payment: number; message: number };
}

export const DEMO_FAN = { email: "ada@example.com", password: "password123" } as const;
export const DEMO_ADMIN = { email: "admin@example.com", password: "admin12345" } as const;

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const categories: Category[] = [
  { id: "c-new", name: "Best New Artist", description: "Breakout acts with a first body of work.", eligibility: "Artists with their first release in the last 18 months.", status: "open" },
  { id: "c-afro", name: "Best Afrobeats Single", description: "Standout releases in Afrobeats.", eligibility: "Any single released this season.", status: "open" },
  { id: "c-street", name: "Best Street-Hop Act", description: "Raw lyricism from the streets.", eligibility: "Street-hop and rap acts.", status: "open" },
  { id: "c-gospel", name: "Best Gospel Act", description: "Worship and gospel talent on the rise.", eligibility: "Gospel and worship artists.", status: "open" },
  { id: "c-producer", name: "Best Producer", description: "The sound behind the song.", eligibility: "Producers credited on a release this season.", status: "open" },
  { id: "c-female", name: "Best Female Vocalist", description: "Voices leading the next wave.", eligibility: "Female lead vocalists.", status: "open" },
];

const sampleArtists: Array<[string, string, number]> = [
  ["Sample Artist 1", "c-new", 1240],
  ["Sample Artist 2", "c-afro", 1115],
  ["Sample Artist 3", "c-street", 980],
  ["Sample Artist 4", "c-gospel", 865],
  ["Sample Artist 5", "c-producer", 742],
  ["Sample Artist 6", "c-female", 690],
  ["Sample Artist 7", "c-new", 655],
  ["Sample Artist 8", "c-afro", 610],
];

const artists: Artist[] = [
  ...sampleArtists.map(([name, categoryId, votes], index): Artist => ({
    id: `a-${index + 1}`,
    slug: `sample-artist-${index + 1}`,
    name,
    bio: "Sample biography for design review. The administrator writes the real biography, music links and categories for every artist.",
    categoryIds: [categoryId],
    musicUrl: "https://example.com/music",
    socialUrl: "https://example.com/social",
    status: "published",
    votes,
  })),
  ...[9, 10].map((n): Artist => ({
    id: `a-${n}`,
    slug: `sample-artist-${n}`,
    name: `Sample Artist ${n}`,
    bio: "Draft profile. Not visible to the public until it is published.",
    categoryIds: ["c-new"],
    musicUrl: "",
    socialUrl: "",
    status: "draft",
    votes: 0,
  })),
];

const season: Season = {
  id: "s-2026",
  name: "2026 Awards",
  votingStatus: "open",
  votePriceKobo: 5000,
  minTopUpKobo: 25000,
  maxTopUpKobo: 5000000,
  rulesVersion: 1,
  votingOpensAt: null,
  votingClosesAt: null,
  showVoteCounts: true,
};

function receipt(n: number, artist: Artist, categoryName: string, votes: number, balanceAfterKobo: number, days: number): VoteReceipt {
  return {
    id: `r-${n}`,
    receiptNo: `SAMPLE-V-${String(n).padStart(4, "0")}`,
    userId: "u-ada",
    artistId: artist.id,
    artistSlug: artist.slug,
    artistName: artist.name,
    categoryName,
    votes,
    priceKobo: 5000,
    totalKobo: votes * 5000,
    balanceAfterKobo,
    createdAt: daysAgo(days),
  };
}

export function createSeedState(): DemoState {
  const [a1, a2, a3] = artists;
  const receipts = [
    receipt(1, a1, "Best New Artist", 3, 85000, 18),
    receipt(2, a3, "Best Street-Hop Act", 2, 75000, 15),
    receipt(3, a2, "Best Afrobeats Single", 1, 70000, 14),
  ];

  const ledger: LedgerEntry[] = [
    { id: "l-1", userId: "u-ada", type: "top_up", amountKobo: 100000, description: "Wallet top-up", relatedId: "p-1", createdAt: daysAgo(19) },
    { id: "l-2", userId: "u-ada", type: "vote_debit", amountKobo: -15000, description: "Votes: Sample Artist 1", relatedId: "r-1", createdAt: daysAgo(18) },
    { id: "l-3", userId: "u-ada", type: "vote_debit", amountKobo: -10000, description: "Votes: Sample Artist 3", relatedId: "r-2", createdAt: daysAgo(15) },
    { id: "l-4", userId: "u-ada", type: "vote_debit", amountKobo: -5000, description: "Votes: Sample Artist 2", relatedId: "r-3", createdAt: daysAgo(14) },
  ];

  const payments: Payment[] = [
    { id: "p-1", reference: "SAMPLE-0001", userId: "u-ada", fanLabel: "Fan 0142", amountKobo: 100000, status: "verified", createdAt: daysAgo(19) },
    { id: "p-2", reference: "SAMPLE-0002", userId: "u-ada", fanLabel: "Fan 0142", amountKobo: 50000, status: "pending", createdAt: daysAgo(16) },
    { id: "p-3", reference: "SAMPLE-0003", userId: "u-ada", fanLabel: "Fan 0142", amountKobo: 200000, status: "failed", createdAt: daysAgo(14) },
    { id: "p-4", reference: "SAMPLE-0004", userId: "u-other-1", fanLabel: "Fan 0058", amountKobo: 25000, status: "refunded", createdAt: daysAgo(12) },
    { id: "p-5", reference: "SAMPLE-0005", userId: "u-other-2", fanLabel: "Fan 0377", amountKobo: 50000, status: "verified", createdAt: daysAgo(6) },
    { id: "p-6", reference: "SAMPLE-0006", userId: "u-other-2", fanLabel: "Fan 0377", amountKobo: 200000, status: "failed", createdAt: daysAgo(5) },
  ];

  const flags: Flag[] = [
    { id: "f-1", subject: "Fan 0142: 40 votes in 2 minutes", detail: "Flag: unusual voting speed. Needs review.", status: "open", createdAt: daysAgo(2) },
    { id: "f-2", subject: "Fan 0377: 3 failed payments in 10 minutes", detail: "Flag: repeated failures. Needs review.", status: "open", createdAt: daysAgo(1) },
  ];

  const audit: AuditEntry[] = [
    { id: "au-1", action: "Published Sample Artist 4", actor: "Admin", createdAt: daysAgo(12) },
    { id: "au-2", action: "Created category Best Producer", actor: "Admin", createdAt: daysAgo(13) },
    { id: "au-3", action: "Refund approved for SAMPLE-0004", actor: "Admin", reason: "Duplicate payment confirmed with the fan.", createdAt: daysAgo(12) },
    { id: "au-4", action: "Voting price reviewed", actor: "Admin", createdAt: daysAgo(15) },
  ];

  return {
    version: 1,
    users: [
      { id: "u-ada", email: DEMO_FAN.email, password: DEMO_FAN.password, displayName: "Ada", role: "fan", emailConfirmed: true, status: "active", createdAt: daysAgo(30) },
      { id: "u-admin", email: DEMO_ADMIN.email, password: DEMO_ADMIN.password, displayName: "Admin", role: "admin", emailConfirmed: true, status: "active", createdAt: daysAgo(60) },
      { id: "u-disabled", email: "disabled@example.com", password: "password123", displayName: "Disabled Fan", role: "fan", emailConfirmed: true, status: "disabled", createdAt: daysAgo(40) },
    ],
    session: null,
    artists,
    categories,
    season,
    ledger,
    payments,
    receipts,
    flags,
    audit,
    winners: [],
    announcements: [
      { id: "an-1", text: "Sample announcement: voting dates appear here once the season is published." },
      { id: "an-2", text: "Sample announcement: nominee profiles are reviewed before they go public." },
    ],
    counters: { receipt: 3, payment: 6, message: 0 },
  };
}

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/services";
import type { Artist, Season, User } from "@/types/domain";

import { VotePanel } from "./vote-panel";

// Mock router
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock session hook
const mockUser: User = {
  id: "u1",
  email: "fan@example.com",
  displayName: "Fan User",
  role: "fan",
  emailConfirmed: true,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/hooks/session", () => ({
  useSession: () => ({
    session: { status: "signedIn", user: mockUser },
    refresh: vi.fn(),
  }),
}));

const mockArtist: Artist = {
  id: "a1",
  slug: "test-artist",
  name: "Test Artist",
  bio: "Rising singer-songwriter.",
  categoryIds: ["cat1"],
  musicUrl: "https://example.com/music",
  socialUrl: "https://example.com/social",
  status: "published",
  votes: 120,
};

const mockSeason: Season = {
  id: "s1",
  name: "2026 Season",
  votingStatus: "open",
  votePriceKobo: 5000, // ₦50 per vote
  minTopUpKobo: 25000,
  maxTopUpKobo: 200000,
  rulesVersion: 1,
  votingOpensAt: "2026-01-01T00:00:00Z",
  votingClosesAt: "2026-12-31T23:59:59Z",
  showVoteCounts: true,
};

describe("VotePanel Custom Voting & Credit Tallying", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders quick choice tiles, custom option, and custom vote input", async () => {
    vi.spyOn(api, "getWallet").mockResolvedValue({
      balanceKobo: 50000, // ₦500
      season: mockSeason,
      payments: [],
      debits: [],
    });

    render(
      <VotePanel
        artist={mockArtist}
        categoryName="Best Vocal Performance"
        season={mockSeason}
        onSeasonChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cast your votes")).toBeInTheDocument();
    });

    // Check presets
    expect(screen.getByRole("button", { name: /^1vote/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^3/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^5votes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^10votes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Custom/i })).toBeInTheDocument();

    // Check custom input field
    expect(screen.getByLabelText(/Custom number of votes/i)).toBeInTheDocument();
  });

  it("warns about insufficient points immediately before confirmation when custom votes exceed balance", async () => {
    // Balance is 6 points (6 votes max)
    vi.spyOn(api, "getWallet").mockResolvedValue({
      balanceKobo: 6,
      balancePoints: 6,
      season: mockSeason,
      payments: [],
      debits: [],
    });

    render(
      <VotePanel
        artist={mockArtist}
        categoryName="Best Vocal Performance"
        season={mockSeason}
        onSeasonChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cast your votes")).toBeInTheDocument();
    });

    const customInput = screen.getByLabelText(/Custom number of votes/i);
    // User types 10 votes (costs 10 points, but wallet only has 6 points)
    fireEvent.change(customInput, { target: { value: "10" } });

    // Warning appears immediately
    expect(screen.getByText("Not enough points.")).toBeInTheDocument();
    expect(screen.getByText(/wallet only has 6 points/i)).toBeInTheDocument();

    // The vote button is replaced/hidden while insufficient
    expect(screen.queryByRole("button", { name: /^Vote with 10 Points/i })).not.toBeInTheDocument();
  });

  it("enables confirmation and approves vote when custom number tallies with available credits", async () => {
    // Balance is 8 points
    vi.spyOn(api, "getWallet").mockResolvedValue({
      balanceKobo: 8,
      balancePoints: 8,
      season: mockSeason,
      payments: [],
      debits: [],
    });

    const castVotesSpy = vi.spyOn(api, "castVotes").mockResolvedValue({
      id: "rcpt-123",
      receiptNo: "VOTE-0001",
      userId: "u1",
      artistId: mockArtist.id,
      artistSlug: mockArtist.slug,
      artistName: mockArtist.name,
      categoryName: "Best Vocal Performance",
      votes: 7,
      priceKobo: 5000,
      totalKobo: 7,
      balanceAfterKobo: 1,
      createdAt: "2026-03-01T12:00:00Z",
    });

    render(
      <VotePanel
        artist={mockArtist}
        categoryName="Best Vocal Performance"
        season={mockSeason}
        onSeasonChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cast your votes")).toBeInTheDocument();
    });

    const customInput = screen.getByLabelText(/Custom number of votes/i);
    // User types 7 votes (7 points <= 8 balance)
    fireEvent.change(customInput, { target: { value: "7" } });

    // Insufficient warning is NOT present
    expect(screen.queryByText("Not enough points.")).not.toBeInTheDocument();

    // Vote button is enabled for 7 Points
    const voteBtn = screen.getByRole("button", { name: "Vote with 7 Points" });
    expect(voteBtn).toBeInTheDocument();

    // Click Vote button to open confirmation dialog
    fireEvent.click(voteBtn);

    // Dialog appears with breakdown
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Confirm your vote")).toBeInTheDocument();
    expect(within(dialog).getByText("7 Points")).toBeInTheDocument();

    // Confirm vote
    const confirmBtn = within(dialog).getByRole("button", { name: "Confirm and vote" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(castVotesSpy).toHaveBeenCalledWith({
        artistSlug: "test-artist",
        votes: 7,
      });
      expect(pushMock).toHaveBeenCalledWith("/receipts/rcpt-123");
    });
  });

  it("allows setting max affordable votes when balance is exceeded", async () => {
    // Balance is 7 points
    vi.spyOn(api, "getWallet").mockResolvedValue({
      balanceKobo: 7,
      balancePoints: 7,
      season: mockSeason,
      payments: [],
      debits: [],
    });

    render(
      <VotePanel
        artist={mockArtist}
        categoryName="Best Vocal Performance"
        season={mockSeason}
        onSeasonChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cast your votes")).toBeInTheDocument();
    });

    // Preset 10 exceeds balance (10 > 7)
    const tenVotesBtn = screen.getByRole("button", { name: /^10votes/i });
    fireEvent.click(tenVotesBtn);

    expect(screen.getByText("Not enough points.")).toBeInTheDocument();

    // "Use max affordable (7 votes)" button is provided
    const maxBtn = screen.getByRole("button", { name: /Use max affordable \(7 votes\)/i });
    fireEvent.click(maxBtn);

    // After clicking, credits tally and warning clears
    expect(screen.queryByText("Not enough points.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vote with 7 Points" })).toBeInTheDocument();
  });
});

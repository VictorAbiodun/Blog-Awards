import { beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "../api";
import { demoApi, resetDemoData, setDemoLatency } from "./demo-api";
import { DEMO_ADMIN, DEMO_FAN } from "./seed";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "ApiError", code });
}

const loginFan = () => demoApi.login({ email: DEMO_FAN.email, password: DEMO_FAN.password });
const loginAdmin = () => demoApi.login({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password });

async function newConfirmedFan(email = "new@example.com") {
  await demoApi.register({ displayName: "New Fan", email, password: "password123" });
  await demoApi.confirmEmailDemo?.(email);
  await demoApi.login({ email, password: "password123" });
}

async function fund(amountKobo: number) {
  const start = await demoApi.startTopUp(amountKobo);
  await demoApi.completeDemoTopUp?.(start.reference, "success");
}

beforeEach(() => {
  setDemoLatency(0);
  resetDemoData();
});

describe("accounts", () => {
  it("rejects a wrong password with a helpful message", async () => {
    await expectCode(demoApi.login({ email: DEMO_FAN.email, password: "nope" }), "invalid_credentials");
  });

  it("blocks login until the email is confirmed", async () => {
    await demoApi.register({ displayName: "A", email: "a@example.com", password: "password123" });
    await expectCode(demoApi.login({ email: "a@example.com", password: "password123" }), "email_not_confirmed");
    await demoApi.confirmEmailDemo?.("a@example.com");
    await expect(demoApi.login({ email: "a@example.com", password: "password123" })).resolves.toMatchObject({ email: "a@example.com" });
  });

  it("does not allow two accounts with the same email", async () => {
    await expectCode(demoApi.register({ displayName: "Ada 2", email: "ADA@example.com", password: "password123" }), "email_taken");
  });

  it("sends a disabled account to the unavailable state", async () => {
    await expectCode(demoApi.login({ email: "disabled@example.com", password: "password123" }), "account_unavailable");
  });

  it("reports session state and ends it on logout", async () => {
    expect((await demoApi.getSession()).status).toBe("signedOut");
    await loginFan();
    expect((await demoApi.getSession()).status).toBe("signedIn");
    await demoApi.logout();
    expect((await demoApi.getSession()).status).toBe("signedOut");
  });

  it("never returns the password to the interface", async () => {
    const user = await loginFan();
    expect(user).not.toHaveProperty("password");
  });
});

describe("wallet and ledger", () => {
  it("derives the balance from the ledger", async () => {
    await loginFan();
    const wallet = await demoApi.getWallet();
    expect(wallet.balanceKobo).toBe(70000); // 100000 - 15000 - 10000 - 5000
  });

  it("requires a signed-in, confirmed account to fund a wallet", async () => {
    await expectCode(demoApi.startTopUp(100000), "not_signed_in");
  });

  it("enforces the season's top-up limits", async () => {
    await loginFan();
    await expectCode(demoApi.startTopUp(100), "amount_out_of_range");
    await expectCode(demoApi.startTopUp(999_999_900), "amount_out_of_range");
  });

  it("credits a wallet only after a verified payment, and only once", async () => {
    await newConfirmedFan();
    const start = await demoApi.startTopUp(100000);
    expect((await demoApi.getWallet()).balanceKobo).toBe(0); // pending: no credits yet
    await demoApi.completeDemoTopUp?.(start.reference, "success");
    await demoApi.completeDemoTopUp?.(start.reference, "success"); // a duplicate callback
    expect((await demoApi.getWallet()).balanceKobo).toBe(100000);
  });

  it("adds no credits for a failed payment", async () => {
    await newConfirmedFan();
    const start = await demoApi.startTopUp(100000);
    const payment = await demoApi.completeDemoTopUp?.(start.reference, "failure");
    expect(payment?.status).toBe("failed");
    expect((await demoApi.getWallet()).balanceKobo).toBe(0);
  });
});

describe("voting", () => {
  it("debits the wallet and records the vote together", async () => {
    await loginFan();
    const before = (await demoApi.getWallet()).balanceKobo;
    const artistBefore = (await demoApi.getArtist("sample-artist-1"))!.votes;
    const receipt = await demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 3 });
    expect(receipt.totalKobo).toBe(15000);
    expect(receipt.balanceAfterKobo).toBe(before - 15000);
    expect((await demoApi.getWallet()).balanceKobo).toBe(before - 15000);
    expect((await demoApi.getArtist("sample-artist-1"))!.votes).toBe(artistBefore + 3);
    await expect(demoApi.getReceipt(receipt.id)).resolves.toMatchObject({ votes: 3 });
  });

  it("refuses a vote the wallet cannot pay for, and changes nothing", async () => {
    await loginFan();
    const before = (await demoApi.getWallet()).balanceKobo;
    await expectCode(demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 100 }), "insufficient_credits");
    expect((await demoApi.getWallet()).balanceKobo).toBe(before);
  });

  it("requires an account, a confirmed email and an open season", async () => {
    await expectCode(demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 1 }), "not_signed_in");
    await loginAdmin();
    await demoApi.setVotingStatus("closed");
    await demoApi.logout();
    await loginFan();
    await expectCode(demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 1 }), "voting_closed");
  });

  it("does not let a fan see someone else's receipt", async () => {
    await loginFan();
    const receipt = await demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 1 });
    await demoApi.logout();
    await newConfirmedFan("other@example.com");
    await expectCode(demoApi.getReceipt(receipt.id), "not_found");
  });

  it("only offers published artists", async () => {
    expect((await demoApi.listArtists()).every((artist) => artist.status === "published")).toBe(true);
    await expect(demoApi.getArtist("sample-artist-9")).resolves.toBeNull(); // a draft
  });
});

describe("administrator rules", () => {
  it("keeps administrator actions away from fans and signed-out visitors", async () => {
    await expectCode(demoApi.getAdminOverview(), "not_signed_in");
    await loginFan();
    await expectCode(demoApi.getAdminOverview(), "forbidden");
    await expectCode(demoApi.setVotingStatus("closed"), "forbidden");
    await expectCode(demoApi.exportReport("payments"), "forbidden");
  });

  it("publishes an artist so it appears publicly, and audits it", async () => {
    await loginAdmin();
    const saved = await demoApi.saveArtist({ name: "Zara Sound", bio: "Singer.", categoryIds: ["c-new"], musicUrl: "", socialUrl: "", status: "published" });
    expect(saved.slug).toBe("zara-sound");
    expect((await demoApi.listArtists()).some((artist) => artist.slug === "zara-sound")).toBe(true);
    expect((await demoApi.listAudit())[0].action).toBe("Published Zara Sound");
  });

  it("needs a written reason for a refund and records it", async () => {
    await loginAdmin();
    await expectCode(demoApi.issueRefund({ paymentId: "p-5", reason: "short" }), "validation");
    const payment = await demoApi.issueRefund({ paymentId: "p-5", reason: "Duplicate payment confirmed." });
    expect(payment.status).toBe("refunded");
    expect((await demoApi.listAudit())[0]).toMatchObject({ reason: "Duplicate payment confirmed." });
    await expectCode(demoApi.issueRefund({ paymentId: "p-5", reason: "Trying to refund twice." }), "validation");
  });

  it("refuses to refund credits the fan has already spent", async () => {
    await newConfirmedFan();
    await fund(25000);
    await demoApi.castVotes({ artistSlug: "sample-artist-1", votes: 5 }); // spends it all
    await demoApi.logout();
    await loginAdmin();
    const payment = (await demoApi.listAdminPayments()).find((p) => p.amountKobo === 25000 && p.status === "verified" && p.reference.startsWith("SAMPLE-T"));
    await expectCode(demoApi.issueRefund({ paymentId: payment!.id, reason: "Fan asked for a refund." }), "validation");
  });

  it("lets winners be published only after voting closes", async () => {
    await loginAdmin();
    await expectCode(demoApi.publishWinner("c-new"), "validation");
    await demoApi.setVotingStatus("closed");
    const winner = await demoApi.publishWinner("c-new");
    expect(winner.artistName).toBe("Sample Artist 1");
    expect((await demoApi.listWinners()).map((w) => w.categoryId)).toContain("c-new");
  });

  it("validates season settings", async () => {
    await loginAdmin();
    await expectCode(demoApi.saveSeasonSettings({ votePriceKobo: 0, minTopUpKobo: 100, maxTopUpKobo: 200, votingOpensAt: null, votingClosesAt: null }), "validation");
    await expectCode(demoApi.saveSeasonSettings({ votePriceKobo: 5000, minTopUpKobo: 300, maxTopUpKobo: 200, votingOpensAt: null, votingClosesAt: null }), "validation");
    const season = await demoApi.saveSeasonSettings({ votePriceKobo: 7500, minTopUpKobo: 25000, maxTopUpKobo: 5000000, votingOpensAt: null, votingClosesAt: null });
    expect(season.rulesVersion).toBe(2);
  });

  it("neutralises spreadsheet formulas in exported reports", async () => {
    await loginAdmin();
    await demoApi.saveArtist({ name: "=2+2", bio: "x", categoryIds: ["c-new"], musicUrl: "", socialUrl: "", status: "published" });
    await demoApi.logout();
    await loginFan();
    await demoApi.castVotes({ artistSlug: "2-2", votes: 1 });
    await demoApi.logout();
    await loginAdmin();
    const csv = await demoApi.exportReport("votes");
    expect(csv).toContain("'=2+2");
    expect(csv).not.toMatch(/(^|,)=2\+2/m);
  });

  it("never puts secrets or card data in a report", async () => {
    await loginAdmin();
    const csv = (await demoApi.exportReport("payments")).toLowerCase();
    for (const forbidden of ["password", "secret", "card", "sk_"]) expect(csv).not.toContain(forbidden);
  });
});

it("exposes the ApiError class the interface relies on", () => {
  expect(new ApiError("not_found", "x")).toBeInstanceOf(Error);
});

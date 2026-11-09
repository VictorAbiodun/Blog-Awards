import { beforeEach, describe, expect, it } from "vitest";

import { demoApi } from "./demo-api";
import { DEMO_ADMIN, DEMO_FAN } from "./seed";
import { resetDemoData } from "./store";

describe("OPay Manual Funding System", () => {
  beforeEach(async () => {
    resetDemoData();
    await demoApi.logout();
  });

  it("returns funding config with OPay details and conversion rate", async () => {
    const config = await demoApi.getFundingConfig();
    expect(config.bankName).toBe("OPay");
    expect(config.nairaPerPoint).toBe(50);
    expect(config.minAmountNaira).toBe(50);
    expect(config.accountNumber).toBeDefined();
    expect(config.accountName).toBeDefined();
  });

  it("requires user to be signed in to create a funding request", async () => {
    await expect(demoApi.createFundingRequest(1000)).rejects.toThrowError(
      expect.objectContaining({ code: "not_signed_in" }),
    );
  });

  it("validates funding amount minimum and multiples of ₦50", async () => {
    await demoApi.login(DEMO_FAN);

    // Below minimum
    await expect(demoApi.createFundingRequest(30)).rejects.toThrowError(
      expect.objectContaining({ code: "validation" }),
    );

    // Not a multiple of 50
    await expect(demoApi.createFundingRequest(125)).rejects.toThrowError(
      expect.objectContaining({ code: "validation" }),
    );
  });

  it("creates a unique funding request with correct expected points", async () => {
    await demoApi.login(DEMO_FAN);

    const req = await demoApi.createFundingRequest(5000);
    expect(req.reference).toMatch(/^FUND-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(req.requestedAmountNaira).toBe(5000);
    expect(req.expectedPoints).toBe(100); // ₦5,000 / 50 = 100 points
    expect(req.status).toBe("awaiting_payment");

    const history = await demoApi.listMyFundingRequests();
    expect(history.some((r) => r.reference === req.reference)).toBe(true);
  });

  it("transitions request to pending_verification when user notifies payment", async () => {
    await demoApi.login(DEMO_FAN);
    const initialBalance = (await demoApi.getWallet()).balancePoints ?? 0;
    const req = await demoApi.createFundingRequest(2500);

    const notified = await demoApi.notifyPaymentMade(req.reference);
    expect(notified.status).toBe("pending_verification");
    expect(notified.submittedAt).toBeDefined();

    // Verify user balance is NOT credited yet
    const wallet = await demoApi.getWallet();
    expect(wallet.balancePoints).toBe(initialBalance);
  });

  it("allows administrator to approve payment with actual amount received and credits points", async () => {
    await demoApi.login(DEMO_FAN);
    const initialBalance = (await demoApi.getWallet()).balancePoints ?? 0;
    const req = await demoApi.createFundingRequest(1000);
    await demoApi.notifyPaymentMade(req.reference);
    await demoApi.logout();

    // Admin logs in
    await demoApi.login(DEMO_ADMIN);

    const overviewBefore = await demoApi.getAdminFundingOverview();
    expect(overviewBefore.pendingCount).toBeGreaterThanOrEqual(1);

    // Admin verifies transfer in OPay history: user requested ₦1,000 but transferred ₦1,500
    const approved = await demoApi.approveFundingRequest({
      requestId: req.id,
      actualAmountNaira: 1500,
    });

    expect(approved.status).toBe("approved");
    expect(approved.actualAmountNaira).toBe(1500);
    expect(approved.creditedPoints).toBe(30); // ₦1,500 / 50 = 30 points
    expect(approved.approvedBy).toBeDefined();

    // Fan logs in and checks balance
    await demoApi.logout();
    await demoApi.login(DEMO_FAN);

    const wallet = await demoApi.getWallet();
    expect(wallet.balancePoints).toBe(initialBalance + 30);
  });

  it("prevents double-approval of the same funding request", async () => {
    await demoApi.login(DEMO_FAN);
    const req = await demoApi.createFundingRequest(1000);
    await demoApi.logout();

    await demoApi.login(DEMO_ADMIN);
    await demoApi.approveFundingRequest({
      requestId: req.id,
      actualAmountNaira: 1000,
    });

    // Second approval attempt must fail
    await expect(
      demoApi.approveFundingRequest({
        requestId: req.id,
        actualAmountNaira: 1000,
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "validation" }));
  });

  it("allows administrator to reject request with a documented reason", async () => {
    await demoApi.login(DEMO_FAN);
    const initialBalance = (await demoApi.getWallet()).balancePoints ?? 0;
    const req = await demoApi.createFundingRequest(500);
    await demoApi.notifyPaymentMade(req.reference);
    await demoApi.logout();

    await demoApi.login(DEMO_ADMIN);
    const rejected = await demoApi.rejectFundingRequest({
      requestId: req.id,
      reason: "No incoming transfer found matching this reference in OPay.",
    });

    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe(
      "No incoming transfer found matching this reference in OPay.",
    );

    // Balance remains unchanged
    await demoApi.logout();
    await demoApi.login(DEMO_FAN);
    const wallet = await demoApi.getWallet();
    expect(wallet.balancePoints).toBe(initialBalance);
  });
});

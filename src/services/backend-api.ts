import { ApiError, type BlogAwardApi } from "./api";

/**
 * THE BACKEND SEAM. This is the one file you fill in.
 *
 * Replace each `notConnected(...)` with a real implementation (for example with
 * Supabase) that returns the shapes in src/types/domain.ts. Read
 * docs/BACKEND-HANDOFF.md first: it lists, method by method, what each screen
 * needs and the security rules every method must follow.
 *
 * While a method is not implemented, the screen that calls it shows a clear
 * "backend not connected" message naming the method, instead of failing silently.
 */
const notConnected =
  (method: string) =>
  (...args: unknown[]): Promise<never> => {
    void args;
    return Promise.reject(
      new ApiError("backend_not_connected", `The backend is not connected yet. Implement "${method}" in src/services/backend-api.ts.`),
    );
  };

export const backendApi: BlogAwardApi = {
  // Accounts
  getSession: notConnected("getSession"),
  register: notConnected("register"),
  login: notConnected("login"),
  logout: notConnected("logout"),
  requestPasswordReset: notConnected("requestPasswordReset"),
  completePasswordReset: notConnected("completePasswordReset"),
  resendConfirmation: notConnected("resendConfirmation"),
  updateProfile: notConnected("updateProfile"),
  changePassword: notConnected("changePassword"),
  deleteAccount: notConnected("deleteAccount"),

  // Public catalogue
  getSeason: notConnected("getSeason"),
  listCategories: notConnected("listCategories"),
  listArtists: notConnected("listArtists"),
  getArtist: notConnected("getArtist"),
  getLeaderboard: notConnected("getLeaderboard"),
  listWinners: notConnected("listWinners"),
  sendContactMessage: notConnected("sendContactMessage"),

  // Signed-in fan
  getDashboard: notConnected("getDashboard"),
  getWallet: notConnected("getWallet"),
  startTopUp: notConnected("startTopUp"),
  getPaymentStatus: notConnected("getPaymentStatus"),
  castVotes: notConnected("castVotes"),
  getReceipt: notConnected("getReceipt"),

  // Administrator
  getAdminOverview: notConnected("getAdminOverview"),
  listAdminArtists: notConnected("listAdminArtists"),
  saveArtist: notConnected("saveArtist"),
  getAdminSeason: notConnected("getAdminSeason"),
  saveSeasonSettings: notConnected("saveSeasonSettings"),
  setVotingStatus: notConnected("setVotingStatus"),
  addCategory: notConnected("addCategory"),
  setCategoryStatus: notConnected("setCategoryStatus"),
  listAdminPayments: notConnected("listAdminPayments"),
  issueRefund: notConnected("issueRefund"),
  listFlags: notConnected("listFlags"),
  reviewFlag: notConnected("reviewFlag"),
  listAudit: notConnected("listAudit"),
  listAdminWinners: notConnected("listAdminWinners"),
  publishWinner: notConnected("publishWinner"),
  exportReport: notConnected("exportReport"),
};

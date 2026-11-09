import { isDemoMode } from "@/lib/demo-mode";

import type { BlogAwardApi } from "./api";
import { backendApi } from "./backend-api";
import { demoApi } from "./demo/demo-api";

/**
 * The one place the interface gets its data from.
 * Demo mode uses fake in-browser data. Otherwise the real backend is used.
 */
export const api: BlogAwardApi = isDemoMode ? demoApi : backendApi;

export { ApiError } from "./api";
export type { ApiErrorCode, BlogAwardApi } from "./api";

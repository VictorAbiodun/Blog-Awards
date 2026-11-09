import { ApiError } from "@/services/api";

/** Turns any thrown value into a sentence that is safe and helpful to show a person. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

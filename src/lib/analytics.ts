/**
 * Application monitoring, performance tracking, and event logging.
 * Provides safe production telemetry stubs that can be wired to Sentry / PostHog / Google Analytics.
 */

export interface TelemetryEvent {
  name: string;
  category?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

/** Logs a structured business or user event. */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const event: TelemetryEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Dispatch custom DOM event for analytics hooks/listeners
  try {
    window.dispatchEvent(new CustomEvent("blog_award_event", { detail: event }));
  } catch {
    // Ignore dispatch failure
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[Telemetry Event]", event.name, event.properties ?? "");
  }
}

/** Logs unexpected application or API errors with context. */
export function trackError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    message,
    stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  if (process.env.NODE_ENV !== "production") {
    console.error("[Telemetry Error]", payload);
  }

  // Hook into third-party tracking (e.g. window.Sentry?.captureException)
  if (typeof window !== "undefined" && (window as unknown as { Sentry?: { captureException: (err: unknown) => void } }).Sentry) {
    (window as unknown as { Sentry: { captureException: (err: unknown) => void } }).Sentry.captureException(error);
  }
}


import type { NextConfig } from "next";

// A production build must never contain the demo (fake data) mode.
if (
  process.env.APP_ENV === "production" &&
  ["true", "1", "yes", "on"].includes((process.env.NEXT_PUBLIC_DEMO_MODE ?? "").trim().toLowerCase())
) {
  throw new Error(
    "NEXT_PUBLIC_DEMO_MODE must be false when building for production. Demo mode uses fake data and simulated payments.",
  );
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/auth/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/auth/register",
        destination: "/register",
        permanent: false,
      },
      {
        source: "/admin/login",
        destination: "/login?next=/admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

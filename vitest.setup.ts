import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not expose globals, so React Testing Library cannot register its
// own cleanup. Unmount rendered components after every test.
afterEach(() => {
  cleanup();
});

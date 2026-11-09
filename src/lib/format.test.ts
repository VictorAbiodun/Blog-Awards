import { describe, expect, it } from "vitest";

import { formatNaira, formatSignedNaira, initials, nairaTextToKobo, pluralise, slugify } from "./format";
import { safeNext } from "./form";

describe("money formatting", () => {
  it("shows integer kobo as naira", () => {
    expect(formatNaira(100000)).toBe("\u20a61,000");
    expect(formatNaira(5000)).toBe("\u20a650");
    expect(formatNaira(25050)).toBe("\u20a6250.50");
    expect(formatNaira(0)).toBe("\u20a60");
  });

  it("signs credits and debits", () => {
    expect(formatSignedNaira(100000)).toBe("+\u20a61,000");
    expect(formatSignedNaira(-15000)).toBe("\u2212\u20a6150");
  });

  it("reads typed naira without floating point drift", () => {
    expect(nairaTextToKobo("0.07")).toBe(7);
    expect(nairaTextToKobo("1,000")).toBe(100000);
    expect(nairaTextToKobo("12.345")).toBeNull();
    expect(nairaTextToKobo("")).toBeNull();
  });
});

describe("text helpers", () => {
  it("builds initials and slugs", () => {
    expect(initials("Sample Artist 1")).toBe("SA");
    expect(initials("")).toBe("?");
    expect(slugify("Zara Sound & Co.")).toBe("zara-sound-co");
  });

  it("pluralises", () => {
    expect(pluralise(1, "vote")).toBe("1 vote");
    expect(pluralise(3, "vote")).toBe("3 votes");
  });
});

describe("safeNext", () => {
  it("only allows redirects to pages on this site", () => {
    expect(safeNext("/wallet", "/dashboard")).toBe("/wallet");
    expect(safeNext("https://evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNext("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeNext("/\\evil", "/dashboard")).toBe("/dashboard");
    expect(safeNext(null, "/dashboard")).toBe("/dashboard");
  });
});

import { describe, expect, it } from "vitest";

import { flagForCountry } from "./flags";
import { formatBytes, formatDuration } from "./utils";

describe("formatBytes", () => {
  it("formats zero and larger values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});

describe("formatDuration", () => {
  it("formats elapsed time as HH:MM:SS", () => {
    const since = new Date(Date.now() - 3661000).toISOString();
    expect(formatDuration(since)).toMatch(/^01:01:0[0-9]$/);
  });
});

describe("flagForCountry", () => {
  it("supports country names and ISO codes", () => {
    expect(flagForCountry("Germany")).not.toBe("??");
    expect(flagForCountry("DE")).not.toBe("??");
  });
});

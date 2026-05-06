import { afterEach, describe, expect, it, vi } from "vitest";

import { lookupPublicIp } from "./ipLookup";

describe("lookupPublicIp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes ip-api responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "success",
        query: "203.0.113.10",
        country: "Germany",
        countryCode: "DE",
        city: "Frankfurt"
      })
    })));

    await expect(lookupPublicIp()).resolves.toMatchObject({
      ip: "203.0.113.10",
      country: "Germany",
      flagCountry: "DE"
    });
  });
});

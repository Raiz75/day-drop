import { describe, expect, it } from "vitest";
import { DRAFT_KEY, auraKey, celebratedKey } from "@/lib/db/schema";

describe("schema keys", () => {
  it("namespaced meta keys", () => {
    expect(DRAFT_KEY).toBe("journal-draft");
    expect(auraKey("abc")).toBe("aura:abc");
    expect(celebratedKey("abc")).toBe("celebrated:abc");
  });
});

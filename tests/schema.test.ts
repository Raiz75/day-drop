import { describe, expect, it } from "vitest";
import { DRAFT_KEY, celebratedKey, rewardKey } from "@/lib/db/schema";

describe("schema keys", () => {
  it("namespaced meta keys", () => {
    expect(DRAFT_KEY).toBe("journal-draft");
    expect(rewardKey("2026-08")).toBe("reward:2026-08");
    expect(celebratedKey("abc")).toBe("celebrated:abc");
  });
});

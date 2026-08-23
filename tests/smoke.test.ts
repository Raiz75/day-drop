import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs vitest with jest-dom matchers available", () => {
    expect(1 + 1).toBe(2);
  });
});

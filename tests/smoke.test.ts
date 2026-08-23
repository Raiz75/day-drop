import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs vitest with jest-dom matchers available", () => {
    const el = document.createElement("div");
    el.className = "ok";
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
  });
});

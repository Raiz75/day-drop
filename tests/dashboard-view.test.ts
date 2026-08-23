/* AI-CONTEXT-NOTE:{"R":"Render-state tests for dashboard pieces: StreakChips zero state and RewardBanner earned state (with mocked hooks/repository).","IDD":[{"?":"dexie-react-hooks useLiveQuery mocked to undefined so no IndexedDB exists during render."},{"?":"repository mocked - importing RewardBanner pulls claimReward but never executes it here."},{"?":"createElement style (no JSX) keeps this a .ts file."}],"A":[{"!!!":"components/dashboard/StreakChips.tsx","CRITICAL":"zero-state copy 'start a streak' pinned unique by getByText"},{"?":"components/dashboard/RewardBanner.tsx earned copy + Claim button"}],"AB":[{"?":"vitest.config.mts happy-dom + globals"},{"?":"vitest.setup.ts jest-dom matchers"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"},{"*":"Extend: active-progress and CTA states if banner logic changes"}]} */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";

const { useEntries } = vi.hoisted(() => ({ useEntries: vi.fn() }));
vi.mock("@/lib/hooks/useEntries", () => ({ useEntries }));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => undefined }));
vi.mock("@/lib/db/repository", () => ({ claimReward: vi.fn(async () => {}) }));

import { StreakChips } from "@/components/dashboard/StreakChips";
import { RewardBanner } from "@/components/dashboard/RewardBanner";

type Streaks = ComponentProps<typeof StreakChips>["streaks"];

describe("dashboard pieces", () => {
  it("renders zero-state streak chips", () => {
    const zero = { journal: 0 } as unknown as Streaks;
    render(createElement(StreakChips, { streaks: zero }));
    expect(screen.getByText(/start a streak/i)).toBeInTheDocument();
  });

  it("RewardBanner earned state celebrates with a claim button", () => {
    render(
      createElement(RewardBanner, {
        month: "2026-07",
        record: { month: "2026-07", text: "dinner out", status: "earned" },
        monthEntries: [],
      }),
    );
    expect(screen.getByText(/reward unlocked/i)).toBeInTheDocument();
    expect(screen.getByText(/dinner out/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim/i })).toBeInTheDocument();
  });

  it("RewardBanner without record shows settings CTA", () => {
    render(
      createElement(RewardBanner, {
        month: "2026-07",
        record: undefined,
        monthEntries: [],
      }),
    );
    expect(screen.getByText(/set your monthly reward/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});

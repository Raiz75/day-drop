/* AI-CONTEXT-NOTE:{"R":"Render-state tests for dashboard pieces: StreakChips zero state and the aura RewardBanner (progress/ready states, presentational onRedeem).","IDD":[{"?":"dexie-react-hooks useLiveQuery mocked to undefined so no IndexedDB exists during render."},{"?":"repository mocked - importing RewardBanner/DashboardView pulls redeemAura but never executes it here."},{"?":"createElement style (no JSX) keeps this a .ts file."}],"A":[{"!!!":"components/dashboard/StreakChips.tsx","CRITICAL":"zero-state copy 'start a streak' pinned unique by getByText"},{"?":"components/dashboard/RewardBanner.tsx pins copy 'you can reward yourself now my dude' + 'Reward self' button"}],"AB":[{"?":"vitest.config.mts happy-dom + globals"},{"?":"vitest.setup.ts jest-dom matchers"},{"?":"lib/scoring.ts AURA_COST"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"}]} */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const { useEntries } = vi.hoisted(() => ({ useEntries: vi.fn() }));
vi.mock("@/lib/hooks/useEntries", () => ({ useEntries }));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => undefined }));
vi.mock("@/lib/db/repository", () => ({ redeemAura: vi.fn(async () => {}) }));

import { StreakChips } from "@/components/dashboard/StreakChips";
import { RewardBanner } from "@/components/dashboard/RewardBanner";
import { AURA_COST } from "@/lib/scoring";

type Streaks = ComponentProps<typeof StreakChips>["streaks"];

describe("dashboard pieces", () => {
  const onRedeem = vi.fn();

  it("renders zero-state streak chips", () => {
    const zero = { journal: 0 } as unknown as Streaks;
    render(createElement(StreakChips, { streaks: zero }));
    expect(screen.getByText(/start a streak/i)).toBeInTheDocument();
  });

  it("progress state shows balance toward the next aura", () => {
    render(createElement(RewardBanner, { balance: 57, auraCount: 2, onRedeem }));
    expect(screen.getByText(/57 \/ 1500 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/aura: 2/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reward self/i })).not.toBeInTheDocument();
  });

  it("ready state offers the reward-self action", () => {
    render(
      createElement(RewardBanner, { balance: AURA_COST + 100, auraCount: 2, onRedeem }),
    );
    expect(screen.getByText(/you can reward yourself now my dude/i)).toBeInTheDocument();
    expect(screen.getByText(/aura: 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reward self/i }));
    expect(onRedeem).toHaveBeenCalledTimes(1);
  });
});

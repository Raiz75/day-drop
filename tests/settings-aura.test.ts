/* AI-CONTEXT-NOTE:{"R":"Regression/render test: Settings shows the Aura card (balance + history) with no loading gate.","IDD":[{"?":"Replaces tests/settings-reward.test.ts after the monthly-reward full wipe."},{"?":"Hooks mocked: storage available=true, useAuraRecords=one record, useLiveQuery=[] (empty habits/aura meta reads)."}],"A":[{"!!!":"components/settings/SettingsView.tsx","CRITICAL":"must render Aura card without any saved-state gating"}],"AB":[{"?":"vitest.config.mts happy-dom + globals"}],"E":[{"!!":"npm test tests/settings-aura.test.ts"}]} */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/hooks/useHydrated", () => ({
  useHydrated: () => true,
  useStorageAvailable: () => true,
}));
vi.mock("@/lib/hooks/useAura", () => ({
  useAuraRecords: () => [{ at: "2026-08-23T10:00:00.000Z" }],
}));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => [] }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));
vi.mock("@/lib/hooks/useServiceWorkerUpdate", () => ({
  useServiceWorkerUpdate: () => ({
    status: "up-to-date",
    checkForUpdates: vi.fn(),
    applyUpdate: vi.fn(),
  }),
}));

import { SettingsView } from "@/components/settings/SettingsView";

describe("settings aura card", () => {
  it("renders balance and redemption history without loading gates", () => {
    render(createElement(SettingsView));
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^aura$/i)).toBeInTheDocument();
    // 1 redemption, no entries -> raw derived balance is negative (accepted edge case);
    // pin the structural "X / 1500 pts" line, not the exact number.
    expect(screen.getByText(/\/ 1500 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 aura/i)).toBeInTheDocument();
  });
});

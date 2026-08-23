/* AI-CONTEXT-NOTE:{"R":"Sticky top app bar showing the page title plus a hydrated dark/light theme toggle.","IDD":[{"?":"useHydrated() gates the resolvedTheme-dependent icon render to avoid SSR/client markup mismatch"},{"?":"Tabler IconSun/IconMoon swap per resolved theme; neutral placeholder until hydrated"}],"A":[{"?":"Route Views (Tasks 13-16) render <Header title=.../> at the top of every page shell"}],"AB":[{"?":"lib/hooks/useHydrated.ts","hydration gate"},{"?":"next-themes","resolvedTheme/setTheme"},{"?":"components/ui/button.tsx","variant=ghost size=icon"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify no hydration mismatch and the toggle flips correctly"},{"*":"title must stay a required string prop"}]} */

"use client";

import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { Button } from "@/components/ui/button";

export function Header({ title }: { title: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const dark = hydrated && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
      <h1 className="text-lg font-bold leading-tight">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        {hydrated ? (
          dark ? (
            <IconSun className="h-5 w-5" />
          ) : (
            <IconMoon className="h-5 w-5" />
          )
        ) : (
          <span className="h-5 w-5" />
        )}
      </Button>
    </header>
  );
}

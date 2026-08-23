"use client";
/* AI-CONTEXT-NOTE:{"R":"next-themes wrapper mounted once in the root layout to provide class-based dark mode.","IDD":[{"?":"defaultTheme=system, enableSystem=true; attribute='class' matches the @custom-variant dark in globals.css."}],"A":[{"?":"every component using bg-background/text-foreground etc."}],"AB":[{"?":"app/layout.tsx"},{"?":"components/settings/SettingsView.tsx theme toggle reads/writes this"}],"E":[{"!!":"npm run build"}]} */
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}

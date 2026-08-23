/* AI-CONTEXT-NOTE:{"R":"Settings route - thin server shell rendering SettingsView.","IDD":[{"?":"force-dynamic because all data comes from client IndexedDB."}],"A":[{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"app/layout.tsx ThemeProvider + Toaster wrap this route"},{"?":"components/shared/BottomNav.tsx rendered inside SettingsView shell"}],"E":[{"!!":"npm run build"},{"?":"Manual smoke: settings cards render; BottomNav highlights Settings tab"}]} */
import { SettingsView } from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default function Page() {
  return <SettingsView />;
}

/* AI-CONTEXT-NOTE:{"R":"Settings route - thin server shell rendering SettingsView.","IDD":[{"?":"force-dynamic because all data comes from client IndexedDB."}],"A":[{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"app/layout.tsx"}],"E":[{"!!":"npm run build"}]} */
export const dynamic = "force-dynamic";

export default function Page() {
  return <div id="settings-root" />;
}

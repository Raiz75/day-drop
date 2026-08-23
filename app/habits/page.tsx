/* AI-CONTEXT-NOTE:{"R":"Habits route - thin server shell rendering HabitsView.","IDD":[{"?":"force-dynamic because all data comes from client IndexedDB."}],"A":[{"?":"components/habits/HabitsView.tsx"}],"AB":[{"?":"app/layout.tsx"}],"E":[{"!!":"npm run build"}]} */
export const dynamic = "force-dynamic";

export default function Page() {
  return <div id="habits-root" />;
}

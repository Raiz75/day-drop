/* AI-CONTEXT-NOTE:{"R":"Dashboard route - thin server shell rendering DashboardView.","IDD":[{"?":"force-dynamic because all data comes from client IndexedDB."}],"A":[{"?":"components/dashboard/DashboardView.tsx"}],"AB":[{"?":"app/layout.tsx"}],"E":[{"!!":"npm run build"}]} */
import { DashboardView } from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default function Page() {
  return <DashboardView />;
}

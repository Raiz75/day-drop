"use client";
/* AI-CONTEXT-NOTE:{"R":"Floating action button bottom-right above BottomNav; starts or edits today's journal.","IDD":[{"?":"Fixed positioning bottom-24 clears the nav bar; z-20 sits above content but below dialogs."}],"A":[{"?":"components/dashboard/DashboardView.tsx which passes onClick + mode"}],"AB":[],"E":[{"?":"Tap target >=48px for mobile"}]} */
import { IconPlus, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Fab({ mode, onClick }: { mode: "plus" | "edit"; onClick: () => void }) {
  return (
    <Button size="icon" onClick={onClick} aria-label={mode === "plus" ? "Start journal" : "Edit today's journal"}
      className={cn("fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg text-xl")}>
      {mode === "plus" ? <IconPlus className="size-6" /> : <IconPencil className="size-6" />}
    </Button>
  );
}

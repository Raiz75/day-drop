/* AI-CONTEXT-NOTE:{"R":"Monthly bucket list checklist displayed on dashboard. Reads items via useBucketList hook.","IDD":[{"?":"Consumes bucketListChecked from today's entry and onToggle callback from DashboardView."},{"?":"Loading/empty states match DailyTasksChecklist pattern."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx"}],"AB":[{"?":"lib/hooks/useBucketList.ts"},{"?":"components/ui/checkbox.tsx"},{"?":"lib/format.ts monthKeyOf, todayStr"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useBucketList } from "@/lib/hooks/useBucketList";
import { monthKeyOf, todayStr } from "@/lib/format";

interface MonthBucketListProps {
  checked: string[];
  onToggle(text: string): void;
}

export function MonthBucketList({ checked, onToggle }: MonthBucketListProps) {
  const monthKey = monthKeyOf(todayStr());
  const items = useBucketList(monthKey);

  if (items === undefined) {
    return <p className="py-4 text-center text-sm text-muted-foreground">loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-6 text-center">
        <p className="text-sm text-muted-foreground">no bucket list this month — set one in the journal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label
          key={item.text}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox
            checked={checked.includes(item.text)}
            onCheckedChange={() => onToggle(item.text)}
          />
          <span className="flex-1 truncate text-base">{item.text}</span>
        </label>
      ))}
    </div>
  );
}

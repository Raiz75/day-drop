/* AI-CONTEXT-NOTE:{"R":"Month-end dialog prompting user to transfer unchecked bucket list items from previous month to current month.","IDD":[{"?":"Uses AlertDialog from shadcn/ui for consistent modal pattern."},{"?":"Deduplicates by text against existing current-month items before saving."},{"?":"Dialog is controlled by parent via open/onOpenChange props."}],"A":[{"?":"components/dashboard/DashboardView.tsx mounts and controls this dialog"}],"AB":[{"?":"components/ui/alert-dialog.tsx"},{"?":"lib/db/repository.ts getBucketList/saveBucketList"},{"?":"lib/format.ts monthKeyOf/addDays/todayStr"}],"E":[{"!!":"npm run build"},{"?":"Verify dialog renders correct item count and singular/plural grammar"},{"?":"Verify dismissed dialog does not persist any state change"},{"?":"Verify transfer merges without duplicates"}]} */
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getBucketList, saveBucketList } from "@/lib/db/repository";

interface BucketListTransferDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  currentMonthKey: string;
  uncheckedItems: string[];
}

export function BucketListTransferDialog({
  open,
  onOpenChange,
  currentMonthKey,
  uncheckedItems,
}: BucketListTransferDialogProps) {
  const handleTransfer = async () => {
    const existing = await getBucketList(currentMonthKey);
    const existingTexts = new Set(existing.map((i) => i.text));
    const newItems = uncheckedItems
      .filter((text) => !existingTexts.has(text))
      .map((text) => ({ text, done: false, doneAt: null }));
    await saveBucketList(currentMonthKey, [...existing, ...newItems]);
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transfer unchecked items?</AlertDialogTitle>
          <AlertDialogDescription>
            {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} from last month&rsquo;s bucket list{" "}
            {uncheckedItems.length !== 1 ? "are" : "is"} unchecked. Transfer to this month?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Start fresh</AlertDialogCancel>
          <AlertDialogAction onClick={handleTransfer}>Transfer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

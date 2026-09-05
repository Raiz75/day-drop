/* AI-CONTEXT-NOTE:{"R":"Wizard step: monthly bucket list with add/remove/checkbox; items persist in meta, checked ids in answers.","IDD":[{"?":"List items stored in meta under key bucketList:<monthKey> (via repository getBucketList/saveBucketList)."},{"?":"Add/remove only enabled first 7 days of the month (isEditable = dayOfMonth <= 7)."},{"?":"Daily answers store bucketListChecked: string[] (the texts user checked today)."}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches here"}],"AB":[{"?":"lib/db/repository.ts getBucketList saveBucketList"},{"?":"lib/format.ts todayStr monthKeyOf dayOfMonth"},{"?":"lib/db/schema.ts BucketListItem DayEntry"},{"?":"components/ui/checkbox.tsx input.tsx button.tsx"},{"?":"@tabler/icons-react IconPlus IconTrash"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { DayEntry } from "@/lib/db/schema";
import type { BucketListItem } from "@/lib/db/schema";
import { getBucketList, saveBucketList } from "@/lib/db/repository";
import { todayStr, monthKeyOf, dayOfMonth } from "@/lib/format";

export function BucketListStep({
  value,
  onChange,
}: {
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const checked: string[] = Array.isArray(value) ? value : [];
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  const today = todayStr();
  const monthKey = monthKeyOf(today);
  const day = dayOfMonth(today);
  const isEditable = day <= 7;

  useEffect(() => {
    let cancelled = false;
    getBucketList(monthKey).then((existing) => {
      if (!cancelled) {
        setItems(existing);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [monthKey]);

  const addItem = async () => {
    const trimmed = input.trim();
    if (trimmed && !items.some((i) => i.text === trimmed)) {
      const updated = [...items, { text: trimmed, done: false, doneAt: null }];
      setItems(updated);
      await saveBucketList(monthKey, updated);
      setInput("");
    }
  };

  const removeItem = async (text: string) => {
    const updated = items.filter((i) => i.text !== text);
    setItems(updated);
    await saveBucketList(monthKey, updated);
  };

  const toggleItem = (text: string) => {
    const isCurrentlyChecked = checked.includes(text);
    const next = isCurrentlyChecked
      ? checked.filter((t) => t !== text)
      : [...checked, text];
    onChange({ bucketListChecked: next });
  };

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">loading bucket list...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isEditable && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="add to bucket list..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button size="icon" variant="secondary" onClick={addItem} disabled={!input.trim()}>
            <IconPlus className="size-4" />
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {isEditable ? "add items to your monthly bucket list" : "no bucket list set this month"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3"
            >
              <Checkbox
                checked={checked.includes(item.text)}
                onCheckedChange={() => toggleItem(item.text)}
              />
              <span className="flex-1 text-base">{item.text}</span>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.text)}
                >
                  <IconTrash className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
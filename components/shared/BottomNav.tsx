/* AI-CONTEXT-NOTE:{"R":"Fixed bottom navigation with the three DayDrop tabs (Home/Habits/Settings) and pathname-based active highlighting.","IDD":[{"?":"Fixed positioning means page shells add bottom padding so content clears the nav"},{"?":"active = exact pathname match, rendered text-primary; inactive text-muted-foreground"}],"A":[{"!!!":"Every route View (Tasks 13-16)","CRITICAL":"all pages render BottomNav and rely on its fixed height"}],"AB":[{"?":"app routes (/, /habits, /settings)","adding a route changes this"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify active highlighting across all three tabs"}]} */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChecklist, IconHome, IconSettings } from "@tabler/icons-react";

const items = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/habits", label: "Habits", icon: IconChecklist },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

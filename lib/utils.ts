/* AI-CONTEXT-NOTE:{"R":"Class-name merge helper (clsx + tailwind-merge) used by every component for conditional styling.","IDD":[{"?":"tailwind-merge resolves conflicting Tailwind classes so later classes win."}],"A":[{"?":"all components importing cn from @/lib/utils"}],"AB":[{"?":"clsx"},{"?":"tailwind-merge"}],"E":[{"!!":"npm run build"},{"?":"Do not add project-specific tokens here"}]} */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

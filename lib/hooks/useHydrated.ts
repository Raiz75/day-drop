/* AI-CONTEXT-NOTE:{"R":"Client hooks: useHydrated hydration gate (false during SSR, true after mount) and useStorageAvailable IndexedDB probe (null before hydration, boolean after).","IDD":[{"?":"useHydrated uses useSyncExternalStore with a no-op subscribe - client snapshot true, server snapshot false - no setState inside useEffect (lint would reject it)"},{"?":"useStorageAvailable probes window.indexedDB existence only; Dexie opens lazily later"}],"A":[{"!!!":"components/shared/Header.tsx","CRITICAL":"gates the theme-toggle render"},{"?":"Route Views (Tasks 13-16)","CRITICAL":"early-return StorageUnavailable when useStorageAvailable() === false"}],"AB":[{"?":"react version","useSyncExternalStore API"},{"?":"components/shared/StorageFallback.tsx","rendered when storage unavailable"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify SSR output renders the neutral placeholder (not sun/moon)"},{"*":"Do not convert to setState-in-effect - react-hooks/set-state-in-effect rejects it"}]} */
"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function useStorageAvailable(): boolean | null {
  const hydrated = useHydrated();
  if (!hydrated) return null; // unknown yet
  return typeof window !== "undefined" && !!window.indexedDB;
}

/* AI-CONTEXT-NOTE:{"R":"Client hooks: useHydrated hydration gate (false during SSR, true after mount) and useStorageAvailable real IndexedDB probe (null before/while probing, boolean after).","IDD":[{"?":"useHydrated uses useSyncExternalStore with a no-op subscribe - client snapshot true, server snapshot false - no setState inside useEffect (lint would reject it)"},{"!":"useStorageAvailable opens a throwaway 'day-drop-storage-probe' DB once after hydration: onsuccess closes it and reports true, onerror/onblocked report false, null while probing; existence of window.indexedDB alone is not enough (private-mode browsers expose the API but block opens)"},{"?":"Probe settles via promise callbacks only - never synchronous setState in the effect body"},{"?":"Dexie still opens its own 'day-drop' lazily later; probe result is advisory for early-return fallbacks"}],"A":[{"!!!":"components/shared/Header.tsx","CRITICAL":"gates the theme-toggle render"},{"?":"Route Views (Tasks 13-16)","CRITICAL":"early-return StorageUnavailable when useStorageAvailable() === false"}],"AB":[{"?":"react version","useSyncExternalStore + useState/useEffect APIs"},{"?":"IndexedDB API","open() success/error/blocked semantics"},{"?":"components/shared/StorageFallback.tsx","rendered when storage unavailable"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify SSR output renders the neutral placeholder (not sun/moon)"},{"?":"Verify views stay null while probing then render once settled"},{"*":"Do not convert to setState-in-effect - react-hooks/set-state-in-effect rejects it"}]} */
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let settled = false;
    void (async () => {
      try {
        if (typeof window === "undefined" || !window.indexedDB) throw new Error("no idb");
        await new Promise<void>((resolve, reject) => {
          const req = window.indexedDB.open("day-drop-storage-probe");
          req.onsuccess = () => {
            req.result.close();
            resolve();
          };
          req.onerror = () => reject(req.error ?? new Error("idb open failed"));
          req.onblocked = () => reject(new Error("idb open blocked"));
        });
        if (!settled) setAvailable(true);
      } catch {
        if (!settled) setAvailable(false);
      }
    })();
    return () => {
      settled = true;
    };
  }, [hydrated]);

  return available;
}

"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, getServerSnapshot } from "@/lib/planStore";

// Reads the plan store; the component re-renders whenever the store changes.
export default function usePlan() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

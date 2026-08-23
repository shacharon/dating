"use client";

import { useEffect, useState } from "react";

export function readNavigatorOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(readNavigatorOnline);

  useEffect(() => {
    const sync = () => setOnline(readNavigatorOnline());
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}

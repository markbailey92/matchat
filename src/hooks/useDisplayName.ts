"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDisplayName, saveDisplayName } from "@/lib/userName";

export function useDisplayName() {
  const [name, setNameState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setNameState(loadDisplayName());
    setLoaded(true);
  }, []);

  const setName = useCallback((value: string) => {
    const trimmed = value.trim();
    setNameState(trimmed);
    if (trimmed) {
      saveDisplayName(trimmed);
    }
  }, []);

  return {
    name,
    loaded,
    hasName: name.length > 0,
    setName,
  };
}

// src/hooks/useSelection.ts
import { useCallback, useState } from "react";

export function useSelection<K extends string | number>() {
  const [selected, setSelected] = useState<Set<K>>(new Set());

  const toggle = useCallback((id: K) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setAll = useCallback((ids: K[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    selected, // Set<K>
    toggle, // (id: K) => void
    setAll, // (ids: K[]) => void
    clear, // () => void
    count: selected.size,
  };
}

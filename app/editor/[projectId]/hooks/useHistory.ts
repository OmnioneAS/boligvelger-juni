import { useRef, useState, useCallback } from 'react';

// Generic undo-only history. Uses a ref for the stack (synchronous reads)
// and a single boolean state to drive the "canUndo" reactive indicator.
export function useHistory<T>() {
  const stackRef = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const push = useCallback((snapshot: T) => {
    stackRef.current = [...stackRef.current, snapshot];
    setCanUndo(true);
  }, []);

  const pop = useCallback((): T | null => {
    if (stackRef.current.length === 0) return null;
    const last = stackRef.current[stackRef.current.length - 1];
    stackRef.current = stackRef.current.slice(0, -1);
    setCanUndo(stackRef.current.length > 0);
    return last;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    setCanUndo(false);
  }, []);

  return { canUndo, push, pop, clear };
}

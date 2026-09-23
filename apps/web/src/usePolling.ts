import { useEffect, useState } from "react";
import { api, errorMessage } from "./api";
import type { Transaction } from "./types";

/** A bounded, serial polling cycle. Hidden/offline tabs do not send requests. */
export function usePolling(
  transaction: Transaction | null,
  onResult: (value: Transaction) => void,
  onError: (value: string) => void,
) {
  const [cycle, setCycle] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  useEffect(() => {
    if (!transaction || transaction.status !== "PENDING") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 1;
    const started = Date.now();
    setExhausted(false);
    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - started >= 60000) {
        setExhausted(true);
        return;
      }
      if (document.visibilityState !== "hidden" && navigator.onLine) {
        try {
          const next = await api.transaction(transaction.id);
          if (cancelled) return;
          onResult(next);
          if (next.status !== "PENDING") return;
        } catch (error) {
          if (!cancelled) onError(errorMessage(error));
        }
      }
      if (!cancelled)
        timer = setTimeout(
          tick,
          Math.min(
            [2000, 3000, 5000, 8000][Math.min(attempts++, 3)],
            Math.max(0, 60000 - (Date.now() - started)),
          ),
        );
    };
    timer = setTimeout(tick, cycle > 0 ? 0 : 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transaction?.id, transaction?.status, cycle, onResult, onError]);
  return { exhausted, restart: () => setCycle((value) => value + 1) };
}

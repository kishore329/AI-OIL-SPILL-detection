// ─────────────────────────────────────────────
// useHealth hook — polls the /health endpoint
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import apiService from "../services/api";

type HealthState = "loading" | "healthy" | "unhealthy";

export function useHealth(intervalMs = 30_000) {
  const [status, setStatus] = useState<HealthState>("loading");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await apiService.health();
        if (!cancelled) {
          setStatus(res.status === "healthy" ? "healthy" : "unhealthy");
        }
      } catch {
        if (!cancelled) setStatus("unhealthy");
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}

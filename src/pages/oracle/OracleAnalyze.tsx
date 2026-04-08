import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { detectEntityType } from "@/lib/oracle/agents/command-brain";

/**
 * Generic dispatch endpoint. When the user runs a query from the
 * landing hero or the Command Center in "auto" mode, Oracle detects
 * the entity type and forwards them to the correct analyzer.
 */
export default function OracleAnalyze() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";

  const route = useMemo(() => {
    if (!q) return "/app/command";
    const detected = detectEntityType(q);
    const base =
      detected.type === "wallet"
        ? "/app/wallet"
        : detected.type === "token"
          ? "/app/token"
          : detected.type === "nft"
            ? "/app/nft"
            : "/app/command";
    return `${base}?q=${encodeURIComponent(q)}`;
  }, [q]);

  return <Navigate to={route} replace />;
}

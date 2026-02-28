import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClusterResponse } from "@/lib/cluster.types";

async function invokeCluster<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cluster-engine", { body });
  if (error) throw new Error(error.message ?? "Cluster engine request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useWalletCluster(
  address: string,
  chain = "cronos",
  windowDays = 7,
  enabled = true
) {
  return useQuery<ClusterResponse>({
    queryKey: ["wallet-cluster", address, chain, windowDays],
    queryFn: () =>
      invokeCluster<ClusterResponse>({
        action: "wallet",
        address,
        chain,
        windowDays,
      }),
    enabled: enabled && !!address && /^0x[a-fA-F0-9]{40}$/.test(address),
    staleTime: 120_000,
    retry: 1,
  });
}

export function useTokenCluster(
  tokenAddress: string,
  chain = "cronos",
  top = 50,
  windowDays = 7,
  enabled = true
) {
  return useQuery<ClusterResponse>({
    queryKey: ["token-cluster", tokenAddress, chain, top, windowDays],
    queryFn: () =>
      invokeCluster<ClusterResponse>({
        action: "token",
        tokenAddress,
        chain,
        top,
        windowDays,
      }),
    enabled: enabled && !!tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(tokenAddress),
    staleTime: 120_000,
    retry: 1,
  });
}

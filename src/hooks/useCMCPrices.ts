import { useQuery } from '@tanstack/react-query';
import type { Chain, DEX } from '@/lib/types';

// All symbols we track, mapped to their chain info
export const TRACKED_TOKENS: { symbol: string; name: string; chain: Chain; dex: DEX }[] = [
  { symbol: 'PEPE', name: 'Pepe', chain: 'ethereum', dex: 'uniswap_v3' },
  { symbol: 'SHIB', name: 'Shiba Inu', chain: 'ethereum', dex: 'uniswap_v2' },
  { symbol: 'FLOKI', name: 'Floki', chain: 'ethereum', dex: 'uniswap_v3' },
  { symbol: 'TURBO', name: 'Turbo', chain: 'ethereum', dex: 'uniswap_v3' },
  { symbol: 'MEME', name: 'Memecoin', chain: 'ethereum', dex: 'uniswap_v2' },
  { symbol: 'DEGEN', name: 'Degen', chain: 'ethereum', dex: 'uniswap_v3' },
  { symbol: 'BONE', name: 'Bone ShibaSwap', chain: 'ethereum', dex: 'uniswap_v2' },
  { symbol: 'BONK', name: 'Bonk', chain: 'solana', dex: 'raydium' },
  { symbol: 'WIF', name: 'dogwifhat', chain: 'solana', dex: 'jupiter' },
  { symbol: 'POPCAT', name: 'Popcat', chain: 'solana', dex: 'raydium' },
  { symbol: 'BOME', name: 'BOOK OF MEME', chain: 'solana', dex: 'raydium' },
  { symbol: 'SLERF', name: 'Slerf', chain: 'solana', dex: 'jupiter' },
  { symbol: 'MOODENG', name: 'Moo Deng', chain: 'solana', dex: 'raydium' },
  { symbol: 'GOAT', name: 'Goatseus Maximus', chain: 'solana', dex: 'jupiter' },
  { symbol: 'FARTCOIN', name: 'Fartcoin', chain: 'solana', dex: 'raydium' },
  { symbol: 'AI16Z', name: 'ai16z', chain: 'solana', dex: 'jupiter' },
  { symbol: 'PNUT', name: 'Peanut the Squirrel', chain: 'solana', dex: 'raydium' },
  { symbol: 'JITO', name: 'Jito', chain: 'solana', dex: 'jupiter' },
  { symbol: 'PYTH', name: 'Pyth Network', chain: 'solana', dex: 'jupiter' },
  { symbol: 'RENDER', name: 'Render', chain: 'solana', dex: 'jupiter' },
  { symbol: 'TRUMP', name: 'Official Trump', chain: 'solana', dex: 'raydium' },
  { symbol: 'MELANIA', name: 'Melania Meme', chain: 'solana', dex: 'raydium' },
  { symbol: 'PENGU', name: 'Pudgy Penguins', chain: 'solana', dex: 'jupiter' },
  { symbol: 'SAMO', name: 'Samoyedcoin', chain: 'solana', dex: 'raydium' },
  { symbol: 'CAKE', name: 'PancakeSwap', chain: 'bsc', dex: 'pancakeswap' },
  { symbol: 'BABYDOGE', name: 'Baby Doge Coin', chain: 'bsc', dex: 'pancakeswap' },
  { symbol: 'ARB', name: 'Arbitrum', chain: 'arbitrum', dex: 'uniswap_v3' },
  { symbol: 'GMX', name: 'GMX', chain: 'arbitrum', dex: 'uniswap_v3' },
  { symbol: 'MAGIC', name: 'Magic', chain: 'arbitrum', dex: 'sushiswap' },
  { symbol: 'RDNT', name: 'Radiant Capital', chain: 'arbitrum', dex: 'uniswap_v3' },
  { symbol: 'PENDLE', name: 'Pendle', chain: 'arbitrum', dex: 'uniswap_v3' },
  { symbol: 'MATIC', name: 'Polygon', chain: 'polygon', dex: 'uniswap_v3' },
  { symbol: 'SAND', name: 'The Sandbox', chain: 'polygon', dex: 'uniswap_v3' },
  { symbol: 'MANA', name: 'Decentraland', chain: 'polygon', dex: 'sushiswap' },
  { symbol: 'AAVE', name: 'Aave', chain: 'polygon', dex: 'uniswap_v3' },
  { symbol: 'BRETT', name: 'Brett', chain: 'base', dex: 'uniswap_v2' },
  { symbol: 'AERO', name: 'Aerodrome', chain: 'base', dex: 'sushiswap' },
  { symbol: 'VIRTUAL', name: 'Virtual', chain: 'base', dex: 'uniswap_v3' },
  { symbol: 'MOG', name: 'Mog Coin', chain: 'base', dex: 'uniswap_v3' },
  { symbol: 'NEIRO', name: 'Neiro', chain: 'base', dex: 'uniswap_v3' },
  { symbol: 'CRO', name: 'Cronos', chain: 'cronos', dex: 'vvs_finance' },
  { symbol: 'VVS', name: 'VVS Finance', chain: 'cronos', dex: 'vvs_finance' },
];

export interface CMCTokenData {
  cmcId: number;
  symbol: string;
  name: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

async function fetchCMCPrices(): Promise<Record<string, CMCTokenData>> {
  const symbols = TRACKED_TOKENS.map(t => t.symbol).join(',');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/fetch-prices?symbols=${encodeURIComponent(symbols)}`,
    {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch prices: ${res.status}`);
  }

  const json = await res.json();
  return json.tokens || {};
}

export function useCMCPrices() {
  return useQuery({
    queryKey: ['cmc-prices'],
    queryFn: fetchCMCPrices,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });
}

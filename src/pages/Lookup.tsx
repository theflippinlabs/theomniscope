import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MiniChart } from '@/components/MiniChart';
import { useI18n } from '@/lib/i18n';
import { formatPrice, formatNumber, formatPct, shortenAddress } from '@/lib/formatters';
import {
  Eye, Search, Copy, ExternalLink, Shield, ShieldAlert, ShieldCheck, Users,
  BarChart3, Droplets, Clock, TrendingUp, TrendingDown, Activity, Loader2,
  AlertTriangle, CheckCircle, XCircle, Flame, Wallet, ArrowLeftRight
} from 'lucide-react';

interface LookupResult {
  address: string;
  symbol: string;
  name: string;
  chain: string;
  dex: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
  txCount24h: number;
  buyCount: number;
  sellCount: number;
  ageHours: number;
  // Risk
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFlags: { label: string; severity: string }[];
  // Extra
  topHolderPct: number;
  isRenounced: boolean;
  isHoneypot: boolean;
  buyTax: number;
  sellTax: number;
  lpLocked: boolean;
  lpLockDays: number;
  deployer: string;
  deployerProjects: number;
  deployerRugs: number;
}

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }

function generateAddress(): string {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function simulateLookup(address: string): LookupResult {
  const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const symbols = ['PEPE2', 'DOGE3', 'MOON', 'APE', 'WOJAK2', 'SHIB2', 'FLOKI2', 'MEME2', 'BONK2', 'CAT'];
  const names = ['Pepe 2.0', 'Doge 3.0', 'MoonCoin', 'ApeCoin', 'Wojak 2.0', 'Shib 2.0', 'Floki 2.0', 'MemeCoin 2', 'Bonk 2.0', 'CatCoin'];
  const chains = ['ethereum', 'solana', 'bsc', 'base', 'arbitrum', 'polygon'];
  const dexes = ['Uniswap V3', 'Raydium', 'PancakeSwap', 'Uniswap V2', 'Jupiter'];
  const idx = hash % symbols.length;
  const riskScore = randInt(10, 90);
  const riskLevel = riskScore < 30 ? 'low' : riskScore < 50 ? 'medium' : riskScore < 70 ? 'high' : 'critical';
  
  const flags: { label: string; severity: string }[] = [];
  if (riskScore > 60) flags.push({ label: 'High holder concentration', severity: 'danger' });
  if (riskScore > 40) flags.push({ label: 'Low liquidity ratio', severity: 'warning' });
  if (riskScore > 70) flags.push({ label: 'Potential honeypot pattern', severity: 'critical' });
  if (riskScore > 30) flags.push({ label: 'Unverified contract', severity: 'info' });
  if (riskScore > 50) flags.push({ label: 'Deployer has rugpull history', severity: 'danger' });

  return {
    address,
    symbol: symbols[idx],
    name: names[idx],
    chain: chains[hash % chains.length],
    dex: dexes[hash % dexes.length],
    price: rand(0.0000001, 2),
    priceChange1h: rand(-20, 40),
    priceChange24h: rand(-50, 100),
    volume24h: rand(10000, 5000000),
    liquidity: rand(5000, 2000000),
    marketCap: rand(10000, 50000000),
    holders: randInt(50, 30000),
    txCount24h: randInt(100, 10000),
    buyCount: randInt(50, 5000),
    sellCount: randInt(50, 5000),
    ageHours: rand(0.5, 2000),
    riskScore,
    riskLevel,
    riskFlags: flags,
    topHolderPct: rand(5, 60),
    isRenounced: Math.random() > 0.5,
    isHoneypot: riskScore > 75 && Math.random() > 0.5,
    buyTax: rand(0, 10),
    sellTax: rand(0, 15),
    lpLocked: Math.random() > 0.3,
    lpLockDays: randInt(30, 365),
    deployer: generateAddress(),
    deployerProjects: randInt(1, 20),
    deployerRugs: riskScore > 50 ? randInt(1, 5) : 0,
  };
}

function RiskMeter({ score }: { score: number }) {
  const color = score < 30 ? 'text-success' : score < 50 ? 'text-warning' : score < 70 ? 'text-orange-400' : 'text-danger';
  const bg = score < 30 ? 'bg-success' : score < 50 ? 'bg-warning' : score < 70 ? 'bg-orange-400' : 'bg-danger';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Risk Score</span>
        <span className={`font-mono text-sm font-bold ${color}`}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${bg}`}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className={`text-xs font-mono font-medium ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function Lookup() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const handleSearch = () => {
    if (!address.trim() || address.trim().length < 10) return;
    setLoading(true);
    setResult(null);
    // Simulate API delay
    setTimeout(() => {
      setResult(simulateLookup(address.trim()));
      setLoading(false);
    }, 1500);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(result?.address || address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAge = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-primary" />
          <h1 className="text-base font-display font-bold text-foreground tracking-tight">{t('lookup.title')}</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">{t('lookup.subtitle')}</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={t('lookup.placeholder')}
              className="pl-9 pr-4 h-10 text-xs font-mono bg-secondary/50 border-border/50 focus:border-primary/30"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || address.trim().length < 10}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {t('lookup.scan')}
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >
                <Eye className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">{t('lookup.scanning')}</p>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !result && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-8 h-8 text-primary opacity-50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">{t('lookup.emptyTitle')}</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">{t('lookup.emptyDesc')}</p>
              </div>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Token header */}
              <div className="gradient-card rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-display font-bold text-foreground">{result.symbol}</h2>
                      <Badge variant="outline" className="text-[9px] uppercase">{result.chain}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{result.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-foreground tabular-nums">{formatPrice(result.price)}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`text-xs font-mono ${result.priceChange1h >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPct(result.priceChange1h)} 1h
                      </span>
                      <span className={`text-xs font-mono ${result.priceChange24h >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPct(result.priceChange24h)} 24h
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{shortenAddress(result.address)}</span>
                  <button onClick={copyAddress} className="hover:text-foreground transition-colors">
                    {copied ? <CheckCircle className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="ml-auto">DEX: {result.dex}</span>
                </div>
              </div>

              {/* Chart */}
              <div className="gradient-card rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">{t('lookup.chart')}</span>
                  <span className="text-[9px] text-muted-foreground font-mono ml-auto">5m candles</span>
                </div>
                <MiniChart basePrice={result.price} height={160} positive={result.priceChange1h >= 0} />
              </div>

              {/* Risk Assessment */}
              <div className={`gradient-card rounded-xl p-4 ${result.riskScore >= 70 ? 'border border-danger/20' : result.riskScore >= 50 ? 'border border-warning/20' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.riskScore < 30 ? <ShieldCheck className="w-4 h-4 text-success" /> :
                   result.riskScore < 50 ? <Shield className="w-4 h-4 text-warning" /> :
                   <ShieldAlert className="w-4 h-4 text-danger" />}
                  <span className="text-sm font-display font-semibold text-foreground">{t('lookup.riskAssessment')}</span>
                </div>
                <RiskMeter score={result.riskScore} />
                
                {/* Honeypot / Tax */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={`rounded-lg p-2 text-center ${result.isHoneypot ? 'bg-danger/10 border border-danger/20' : 'bg-success/10 border border-success/20'}`}>
                    <span className="text-[9px] text-muted-foreground block">Honeypot</span>
                    <span className={`text-xs font-bold ${result.isHoneypot ? 'text-danger' : 'text-success'}`}>
                      {result.isHoneypot ? '⚠ DETECTED' : '✓ SAFE'}
                    </span>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${result.isRenounced ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
                    <span className="text-[9px] text-muted-foreground block">Ownership</span>
                    <span className={`text-xs font-bold ${result.isRenounced ? 'text-success' : 'text-warning'}`}>
                      {result.isRenounced ? '✓ Renounced' : '⚠ Not renounced'}
                    </span>
                  </div>
                </div>

                {/* Tax info */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-lg p-2 text-center bg-secondary/50">
                    <span className="text-[9px] text-muted-foreground block">Buy Tax</span>
                    <span className={`text-xs font-bold font-mono ${result.buyTax > 5 ? 'text-danger' : 'text-foreground'}`}>{result.buyTax.toFixed(1)}%</span>
                  </div>
                  <div className="rounded-lg p-2 text-center bg-secondary/50">
                    <span className="text-[9px] text-muted-foreground block">Sell Tax</span>
                    <span className={`text-xs font-bold font-mono ${result.sellTax > 5 ? 'text-danger' : 'text-foreground'}`}>{result.sellTax.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Risk flags */}
                {result.riskFlags.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {result.riskFlags.map((flag, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {flag.severity === 'critical' ? <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" /> :
                         flag.severity === 'danger' ? <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" /> :
                         flag.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" /> :
                         <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className="text-foreground/80">{flag.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Market metrics */}
              <div className="gradient-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-display font-semibold text-foreground">{t('lookup.metrics')}</span>
                </div>
                <InfoRow label="Market Cap" value={formatNumber(result.marketCap)} icon={<TrendingUp className="w-3 h-3" />} />
                <InfoRow label="Volume 24h" value={formatNumber(result.volume24h)} icon={<BarChart3 className="w-3 h-3" />} />
                <InfoRow label="Liquidity" value={formatNumber(result.liquidity)} icon={<Droplets className="w-3 h-3" />} />
                <InfoRow label="Holders" value={result.holders.toLocaleString()} icon={<Users className="w-3 h-3" />} />
                <InfoRow label="Age" value={formatAge(result.ageHours)} icon={<Clock className="w-3 h-3" />} />
                <InfoRow label="Txns 24h" value={result.txCount24h.toLocaleString()} icon={<ArrowLeftRight className="w-3 h-3" />} />
              </div>

              {/* Trading Activity */}
              <div className="gradient-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  <span className="text-sm font-display font-semibold text-foreground">{t('lookup.activity')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-success/10 p-3 text-center">
                    <p className="text-[9px] text-muted-foreground mb-0.5">Buys</p>
                    <p className="text-sm font-bold font-mono text-success">{result.buyCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-danger/10 p-3 text-center">
                    <p className="text-[9px] text-muted-foreground mb-0.5">Sells</p>
                    <p className="text-sm font-bold font-mono text-danger">{result.sellCount.toLocaleString()}</p>
                  </div>
                </div>
                {/* Buy/Sell pressure bar */}
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div className="bg-success h-full" style={{ width: `${(result.buyCount / (result.buyCount + result.sellCount)) * 100}%` }} />
                  <div className="bg-danger h-full flex-1" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono text-success">{((result.buyCount / (result.buyCount + result.sellCount)) * 100).toFixed(0)}% buy</span>
                  <span className="text-[9px] font-mono text-danger">{((result.sellCount / (result.buyCount + result.sellCount)) * 100).toFixed(0)}% sell</span>
                </div>
              </div>

              {/* Liquidity & Security */}
              <div className="gradient-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-primary" />
                  <span className="text-sm font-display font-semibold text-foreground">{t('lookup.security')}</span>
                </div>
                <InfoRow
                  label="LP Locked"
                  value={result.lpLocked ? `✓ ${result.lpLockDays}d` : '✗ No'}
                  color={result.lpLocked ? 'text-success' : 'text-danger'}
                />
                <InfoRow
                  label="Top Holder %"
                  value={`${result.topHolderPct.toFixed(1)}%`}
                  color={result.topHolderPct > 30 ? 'text-danger' : result.topHolderPct > 15 ? 'text-warning' : 'text-foreground'}
                />
                <InfoRow
                  label="Deployer"
                  value={shortenAddress(result.deployer)}
                  icon={<Wallet className="w-3 h-3" />}
                />
                <InfoRow
                  label="Deployer Projects"
                  value={`${result.deployerProjects} (${result.deployerRugs} rugs)`}
                  color={result.deployerRugs > 0 ? 'text-danger' : 'text-foreground'}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
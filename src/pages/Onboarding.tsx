import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Chain } from '@/lib/types';
import type { UserMode, RiskProfile, UserPreferences } from '@/lib/userPreferences';
import {
  Zap, Shield, Eye, Gauge,
  ChevronRight, ChevronLeft,
  Bell, TrendingUp, ShieldAlert, BarChart3,
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: Partial<UserPreferences>) => void;
}

const chains: { id: Chain; label: string; icon: string }[] = [
  { id: 'ethereum', label: 'Ethereum', icon: 'Ξ' },
  { id: 'bsc', label: 'BNB Chain', icon: 'B' },
  { id: 'polygon', label: 'Polygon', icon: 'P' },
  { id: 'arbitrum', label: 'Arbitrum', icon: 'A' },
  { id: 'base', label: 'Base', icon: '◆' },
];

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<UserMode>('simple');
  const [risk, setRisk] = useState<RiskProfile>('standard');
  const [selectedChains, setSelectedChains] = useState<Chain[]>(['ethereum', 'bsc', 'arbitrum', 'polygon', 'base']);
  const [alertTypes, setAlertTypes] = useState<string[]>(['signal', 'risk']);

  const toggleChain = (c: Chain) => {
    setSelectedChains(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const toggleAlert = (a: string) => {
    setAlertTypes(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const finish = () => {
    onComplete({
      mode,
      riskProfile: risk,
      chains: selectedChains,
      alertTypes: alertTypes as any,
      onboardingComplete: true,
    });
  };

  const steps = [
    // Step 1: Mode
    <div key="mode" className="space-y-8">
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto"
        >
          <span className="text-2xl font-display font-bold text-primary">O</span>
        </motion.div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">OMNISCOPE</h1>
        <p className="text-sm text-muted-foreground">Elite DEX Intelligence</p>
      </div>
      <div className="grid gap-3">
        {([
          { id: 'simple' as UserMode, label: 'Simple', desc: 'Clean signals, intuitive interface. Perfect to start.', icon: Eye, badge: 'Recommended' },
          { id: 'pro' as UserMode, label: 'Pro', desc: 'All data, technical indicators, detailed risk scanner.', icon: Gauge, badge: null },
        ]).map(m => (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode(m.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === m.id
                ? 'border-primary/50 bg-primary/5 glow-primary'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <m.icon className={`w-5 h-5 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-semibold text-foreground">{m.label}</span>
              {m.badge && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-mono">{m.badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground ml-8">{m.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>,

    // Step 2: Risk
    <div key="risk" className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Risk Profile</h2>
        <p className="text-sm text-muted-foreground">Filters signals based on your tolerance</p>
      </div>
      <div className="grid gap-3">
        {([
          { id: 'conservative' as RiskProfile, label: 'Conservative', desc: 'High confidence only. Established tokens, low risk.', icon: Shield, color: 'text-success' },
          { id: 'standard' as RiskProfile, label: 'Standard', desc: 'Balanced risk/reward. Medium to high confidence signals.', icon: Zap, color: 'text-primary' },
          { id: 'aggressive' as RiskProfile, label: 'Aggressive', desc: 'All signals including high risk. For experienced traders.', icon: TrendingUp, color: 'text-warning' },
        ]).map(r => (
          <motion.button
            key={r.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRisk(r.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              risk === r.id
                ? 'border-primary/50 bg-primary/5 glow-primary'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <r.icon className={`w-5 h-5 ${r.color}`} />
              <span className="font-semibold text-foreground">{r.label}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-8">{r.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>,

    // Step 3: Chains
    <div key="chains" className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Chains</h2>
        <p className="text-sm text-muted-foreground">Select blockchains to monitor</p>
      </div>
      <div className="grid gap-2.5">
        {chains.map(c => (
          <motion.button
            key={c.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleChain(c.id)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
              selectedChains.includes(c.id)
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <span className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-foreground text-sm font-mono">
              {c.icon}
            </span>
            <span className="font-medium text-foreground text-sm">{c.label}</span>
            <span className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedChains.includes(c.id)
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {selectedChains.includes(c.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
            </span>
          </motion.button>
        ))}
      </div>
    </div>,

    // Step 4: Alerts
    <div key="alerts" className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Alerts</h2>
        <p className="text-sm text-muted-foreground">Choose what triggers notifications</p>
      </div>
      <div className="grid gap-2.5">
        {([
          { id: 'price', label: 'Price', desc: 'Alert when price crosses a threshold', icon: TrendingUp },
          { id: 'volume', label: 'Volume', desc: 'Volume spikes or unusual transactions', icon: BarChart3 },
          { id: 'signal', label: 'Signals', desc: 'New Entry / Exit / Avoid signals', icon: Zap },
          { id: 'risk', label: 'Risk', desc: 'Risk score changes', icon: ShieldAlert },
        ]).map(a => (
          <motion.button
            key={a.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleAlert(a.id)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
              alertTypes.includes(a.id)
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <a.icon className={`w-4 h-4 ${alertTypes.includes(a.id) ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <span className="font-medium text-foreground text-sm">{a.label}</span>
              <p className="text-[11px] text-muted-foreground">{a.desc}</p>
            </div>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              alertTypes.includes(a.id)
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {alertTypes.includes(a.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
            </span>
          </motion.button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-background gradient-hero flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="h-1 rounded-full flex-1"
              animate={{
                backgroundColor: i <= step ? 'hsl(160, 100%, 45%)' : 'hsl(225, 16%, 11%)',
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center font-mono">
          {step + 1} / 4
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 pt-4 flex gap-3 max-w-md mx-auto w-full">
        {step > 0 && (
          <Button
            variant="outline"
            className="flex-1 border-border/50"
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setStep(s => s + 1)}
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            onClick={finish}
          >
            <Zap className="w-4 h-4 mr-1" />
            Launch OMNISCOPE
          </Button>
        )}
      </div>
    </div>
  );
}

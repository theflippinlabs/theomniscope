import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import type { UserPreferences } from '@/lib/userPreferences';
import type { Chain } from '@/lib/types';
import {
  Eye, Gauge, Shield, Zap, TrendingUp,
  RotateCcw, Settings, Sun, Moon, ShieldCheck
} from 'lucide-react';
import type { ThemeMode } from '@/lib/userPreferences';

interface ProfileProps {
  prefs: UserPreferences;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

export default function Profile({ prefs, onUpdatePrefs }: ProfileProps) {
  const { t, lang, toggleLang } = useI18n();
  const navigate = useNavigate();
  const isAdmin = useAdminStatus();

  const riskLabels = {
    conservative: t('onboarding.conservative'),
    standard: t('onboarding.standard'),
    aggressive: t('onboarding.aggressive'),
  };
  const riskIcons = { conservative: Shield, standard: Zap, aggressive: TrendingUp };
  const chainLabels: Record<Chain, string> = {
    ethereum: 'Ethereum', solana: 'Solana', bsc: 'BNB Chain', polygon: 'Polygon', arbitrum: 'Arbitrum', base: 'Base', cronos: 'Cronos',
  };

  return (
    <div>
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h1 className="text-base font-display font-bold text-foreground tracking-tight flex-1">{t('profile.title')}</h1>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-full px-3 py-1.5 border border-border/50"
          >
            <span className={lang === 'en' ? 'text-foreground font-semibold' : ''}>EN</span>
            <span className="text-muted-foreground/40">|</span>
            <span className={lang === 'fr' ? 'text-foreground font-semibold' : ''}>FR</span>
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Appearance */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="gradient-card rounded-xl p-4">
          <h3 className="text-xs font-display font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t('profile.appearance')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'light' as const, label: t('profile.light'), icon: Sun },
              { id: 'dark' as const, label: t('profile.dark'), icon: Moon },
            ] as { id: ThemeMode; label: string; icon: typeof Sun }[]).map(th => (
              <button
                key={th.id}
                onClick={() => onUpdatePrefs({ theme: th.id })}
                className={`p-3 rounded-lg border text-center transition-all ${
                  prefs.theme === th.id ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-secondary/30 hover:border-border'
                }`}
              >
                <th.icon className={`w-5 h-5 mx-auto mb-1 ${prefs.theme === th.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium text-foreground">{th.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Mode */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="gradient-card rounded-xl p-4">
          <h3 className="text-xs font-display font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t('profile.displayMode')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'simple' as const, label: t('onboarding.simple'), icon: Eye },
              { id: 'pro' as const, label: t('onboarding.pro'), icon: Gauge },
            ]).map(m => (
              <button
                key={m.id}
                onClick={() => onUpdatePrefs({ mode: m.id })}
                className={`p-3 rounded-lg border text-center transition-all ${
                  prefs.mode === m.id ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-secondary/30 hover:border-border'
                }`}
              >
                <m.icon className={`w-5 h-5 mx-auto mb-1 ${prefs.mode === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium text-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Risk profile */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="gradient-card rounded-xl p-4">
          <h3 className="text-xs font-display font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t('profile.riskProfile')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['conservative', 'standard', 'aggressive'] as const).map(r => {
              const RIcon = riskIcons[r];
              return (
                <button
                  key={r}
                  onClick={() => onUpdatePrefs({ riskProfile: r })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    prefs.riskProfile === r ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-secondary/30 hover:border-border'
                  }`}
                >
                  <RIcon className={`w-4 h-4 mx-auto mb-1 ${prefs.riskProfile === r ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-[10px] font-medium text-foreground">{riskLabels[r]}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Chains */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="gradient-card rounded-xl p-4">
          <h3 className="text-xs font-display font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t('profile.activeChains')}</h3>
          <div className="space-y-1.5">
            {(['ethereum', 'solana', 'bsc', 'polygon', 'arbitrum', 'base', 'cronos'] as Chain[]).map(c => (
              <button
                key={c}
                onClick={() => {
                  const newChains = prefs.chains.includes(c)
                    ? prefs.chains.filter(x => x !== c)
                    : [...prefs.chains, c];
                  onUpdatePrefs({ chains: newChains });
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  prefs.chains.includes(c) ? 'border-primary/30 bg-primary/3' : 'border-border/50 bg-secondary/30'
                }`}
              >
                <span className="text-sm text-foreground">{chainLabels[c]}</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  prefs.chains.includes(c) ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {prefs.chains.includes(c) && <span className="text-primary-foreground text-[8px]">✓</span>}
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Admin access */}
        {isAdmin && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="gradient-card rounded-xl p-4">
            <Button
              variant="outline"
              className="w-full border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Administration
            </Button>
          </motion.section>
        )}

        {/* Reset */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="gradient-card rounded-xl p-4">
          <Button
            variant="outline"
            className="w-full border-border/50 text-muted-foreground hover:text-foreground"
            onClick={() => onUpdatePrefs({ onboardingComplete: false })}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('profile.resetOnboarding')}
          </Button>
        </motion.section>

        <div className="text-center text-[10px] text-muted-foreground/40 pb-8 space-y-0.5 font-mono">
          <p>ORACLE v1.0 — by The Flippin' Labs</p>
          <p>{t('profile.disclaimer')}</p>
        </div>
      </main>
    </div>
  );
}

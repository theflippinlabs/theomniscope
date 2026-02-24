import { motion } from 'framer-motion';
import type { Token, RiskReport } from '@/lib/types';
import { RiskBadge } from './RiskBadge';
import { ShieldAlert } from 'lucide-react';

interface RiskPanelProps {
  token: Token;
  risk: RiskReport;
}

export function RiskPanel({ risk }: RiskPanelProps) {
  const severityOrder = { critical: 0, danger: 1, warning: 2, info: 3 };
  const sorted = [...risk.flags].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="gradient-card-elevated rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">Risk Scanner</h3>
        </div>
        <RiskBadge score={risk.score} level={risk.level} />
      </div>

      {/* Risk meter */}
      <div className="mb-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${risk.score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: risk.score >= 70
                ? 'hsl(0, 84%, 60%)'
                : risk.score >= 45
                ? 'hsl(42, 100%, 55%)'
                : risk.score >= 25
                ? 'hsl(42, 80%, 60%)'
                : 'hsl(152, 82%, 42%)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-muted-foreground/50 font-mono">
          <span>Safe</span>
          <span>Critical</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.map((flag, i) => {
          const colors = {
            info: 'border-l-primary/50',
            warning: 'border-l-warning/70',
            danger: 'border-l-danger/70',
            critical: 'border-l-danger',
          };
          return (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border-l-2 ${colors[flag.severity]} pl-3 py-1.5`}
            >
              <p className="text-[11px] font-semibold text-foreground">{flag.label}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{flag.detail}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

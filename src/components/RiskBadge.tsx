import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/lib/types';

const levelConfig: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: 'Safe', className: 'bg-success/10 text-success border-success/20' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning border-warning/20' },
  high: { label: 'High', className: 'bg-danger/10 text-danger border-danger/20' },
  critical: { label: 'AVOID', className: 'bg-danger/15 text-danger border-danger/30 animate-pulse-glow' },
};

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  showScore?: boolean;
}

export function RiskBadge({ score, level, showScore = true }: RiskBadgeProps) {
  const config = levelConfig[level];
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${config.className}`}>
      {config.label}{showScore && ` ${score}`}
    </Badge>
  );
}

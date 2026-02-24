import { Badge } from '@/components/ui/badge';
import type { SignalType, Confidence } from '@/lib/types';

const typeConfig: Record<SignalType, { className: string }> = {
  ENTRY: { className: 'bg-success/10 text-success border-success/20' },
  EXIT: { className: 'bg-danger/10 text-danger border-danger/20' },
  HOLD: { className: 'bg-warning/10 text-warning border-warning/20' },
  AVOID: { className: 'bg-danger/15 text-danger border-danger/30' },
};

const confDots: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

interface SignalBadgeProps {
  type: SignalType;
  confidence?: Confidence;
}

export function SignalBadge({ type, confidence }: SignalBadgeProps) {
  const config = typeConfig[type];
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={`font-mono text-[10px] font-bold tracking-wider ${config.className}`}>
        {type}
      </Badge>
      {confidence && (
        <span className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < confDots[confidence] ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </span>
      )}
    </div>
  );
}

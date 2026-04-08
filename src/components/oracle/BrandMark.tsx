import { cn } from "@/lib/utils";

/**
 * Oracle Sentinel brand mark.
 *
 * Built inline with SVG so it renders instantly and is independent of
 * any image asset. The aesthetic is a geometric "eye + circuit" mark
 * in electric blue against obsidian black.
 */
export function BrandMark({
  size = 28,
  className,
  withWordmark = false,
}: {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className="relative flex items-center justify-center rounded-md border border-white/10 bg-black/60"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          width={size - 8}
          height={size - 8}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-sky-300"
        >
          <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <path d="M3 12h3M18 12h3M12 3v3M12 18v3" strokeOpacity="0.6" />
        </svg>
        <div
          className="pointer-events-none absolute inset-0 rounded-md"
          style={{
            boxShadow:
              "inset 0 0 12px rgba(56,189,248,0.15), 0 0 24px -8px rgba(56,189,248,0.35)",
          }}
        />
      </div>
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <div className="font-display text-sm font-semibold tracking-tight text-zinc-100">
            Oracle <span className="text-sky-300">Sentinel</span>
          </div>
          <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Web3 Intelligence
          </div>
        </div>
      )}
    </div>
  );
}

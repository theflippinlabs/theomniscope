import { Search, Wallet, Coins, Image as ImageIcon, Loader2, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Kbd } from "./primitives";

const QUICK_EXAMPLES = [
  { label: "Whale 042", type: "wallet" as const },
  { label: "MoonPaw Inu", type: "token" as const },
  { label: "Luminar Genesis", type: "nft" as const },
];

export function EntitySearch({
  autoFocus = false,
  large = false,
}: {
  autoFocus?: boolean;
  large?: boolean;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"auto" | "wallet" | "token" | "nft">("auto");

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const input = value.trim();
    if (!input) {
      navigate("/app/command");
      return;
    }
    setSubmitting(true);
    const path =
      tab === "wallet"
        ? `/app/wallet?q=${encodeURIComponent(input)}`
        : tab === "token"
          ? `/app/token?q=${encodeURIComponent(input)}`
          : tab === "nft"
            ? `/app/nft?q=${encodeURIComponent(input)}`
            : `/app/analyze?q=${encodeURIComponent(input)}`;
    setTimeout(() => navigate(path), 120);
  };

  const tabs = [
    { id: "auto" as const, label: "Auto", icon: <Zap className="h-3 w-3" /> },
    { id: "wallet" as const, label: "Wallet", icon: <Wallet className="h-3 w-3" /> },
    { id: "token" as const, label: "Token", icon: <Coins className="h-3 w-3" /> },
    { id: "nft" as const, label: "NFT", icon: <ImageIcon className="h-3 w-3" /> },
  ];

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
              tab === t.id
                ? "bg-white/[0.07] text-zinc-100 border border-white/[0.08]"
                : "text-zinc-400 border border-transparent hover:text-zinc-200",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={onSubmit}
        className={cn(
          "group relative flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 transition focus-within:border-sky-400/50 focus-within:shadow-[0_0_0_4px_rgba(56,189,248,0.08)]",
          large ? "px-4 py-3" : "px-3.5 py-2.5",
        )}
      >
        <Search className={cn("text-zinc-500", large ? "h-4 w-4" : "h-4 w-4")} />
        <input
          type="text"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a wallet, token contract, or NFT collection"
          className={cn(
            "flex-1 bg-transparent font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none",
            large ? "text-sm" : "text-[13px]",
          )}
        />
        <div className="hidden items-center gap-1 text-[10px] text-zinc-500 md:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/25"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              Run analysis
              <span aria-hidden>→</span>
            </>
          )}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">
          Try
        </span>
        {QUICK_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              setValue(ex.label);
              setTab(ex.type);
            }}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-zinc-400 transition hover:border-sky-400/40 hover:text-sky-200"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}

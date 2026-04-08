import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { ArrowRight, Shield } from "lucide-react";

const PUBLIC_NAV = [
  { label: "Product", href: "/#modules" },
  { label: "Methodology", href: "/methodology" },
  { label: "Security", href: "/security" },
  { label: "Transparency", href: "/transparency" },
];

/**
 * Chrome for public pages (landing, methodology, security, etc.).
 * Forces the obsidian palette regardless of global theme state.
 */
export function OraclePublicShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative min-h-screen bg-[#05060a] text-zinc-100 antialiased">
      {/* Ambient grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(56,189,248,0.12),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.5), transparent 70%)",
        }}
      />

      <header className="relative z-20 border-b border-white/[0.06] bg-[#05060a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark size={30} withWordmark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-100",
                  pathname === item.href && "text-zinc-100",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/legal"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              Legal
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/app/command"
              className="hidden items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/25 md:inline-flex"
            >
              Open Command Center
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 mt-24 border-t border-white/[0.06] bg-[#05060a]/80">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <BrandMark size={28} withWordmark />
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Oracle Sentinel is a Web3 intelligence and risk command center.
                It transforms on-chain data, NFT activity, social sentiment, and
                threat indicators into transparent, scored, actionable findings.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                <Shield className="h-3 w-3" />
                Read-only analysis — no wallet access
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 text-xs md:grid-cols-3">
              <div>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Product
                </div>
                <ul className="space-y-2">
                  <li>
                    <Link to="/app/command" className="text-zinc-400 hover:text-zinc-100">
                      Command Center
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/wallet" className="text-zinc-400 hover:text-zinc-100">
                      Wallet Analyzer
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/token" className="text-zinc-400 hover:text-zinc-100">
                      Token Analyzer
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/nft" className="text-zinc-400 hover:text-zinc-100">
                      NFT Monitoring
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/reports" className="text-zinc-400 hover:text-zinc-100">
                      Reports
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Trust
                </div>
                <ul className="space-y-2">
                  <li>
                    <Link to="/methodology" className="text-zinc-400 hover:text-zinc-100">
                      Methodology
                    </Link>
                  </li>
                  <li>
                    <Link to="/security" className="text-zinc-400 hover:text-zinc-100">
                      Security
                    </Link>
                  </li>
                  <li>
                    <Link to="/transparency" className="text-zinc-400 hover:text-zinc-100">
                      Transparency
                    </Link>
                  </li>
                  <li>
                    <Link to="/legal" className="text-zinc-400 hover:text-zinc-100">
                      Legal
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  System
                </div>
                <ul className="space-y-2 text-zinc-500">
                  <li>Oracle v2.4.0</li>
                  <li>9 agents online</li>
                  <li>All systems nominal</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/[0.05] pt-6 text-[10px] text-zinc-500 md:flex-row md:items-center">
            <div>
              Oracle Sentinel is informational only. Not financial advice.
            </div>
            <div>© {new Date().getFullYear()} Oracle Sentinel</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

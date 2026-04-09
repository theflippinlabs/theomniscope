/**
 * Oracle Sentinel — sign-in + sign-up page.
 *
 * A single screen with two modes switched by a tab. Styled to match
 * the existing Oracle aesthetic (zinc dark surface, sky accents,
 * monospace form elements) without adding new primitives.
 */

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import oracleLogo from "@/assets/oracle-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

type Mode = "signin" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/app";
  const { isAuthenticated, loading, signIn, signUp, error: storeError } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, next]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      const result =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);
      if (result.error) {
        setLocalError(result.error);
        return;
      }
      if (mode === "signup") {
        setLocalError(
          "Check your inbox to confirm your email, then sign in.",
        );
        setMode("signin");
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = localError ?? storeError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={oracleLogo} alt="Oracle Sentinel" className="h-10 w-10" />
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-50">
              Oracle Sentinel
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {mode === "signin" ? "Sign in to continue" : "Create an account"}
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 text-[11px] font-semibold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              mode === "signin"
                ? "bg-sky-500/15 text-sky-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              mode === "signup"
                ? "bg-sky-500/15 text-sky-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Create account
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Email
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 font-mono text-xs"
                placeholder="analyst@example.com"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Password
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 font-mono text-xs"
                placeholder="••••••••"
              />
            </div>
          </label>

          {displayError && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
              {displayError}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-500 text-zinc-950 hover:bg-sky-400"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="mt-5 text-center text-[11px] text-zinc-500">
          <Link to="/" className="hover:text-zinc-300">
            ← Back to marketing site
          </Link>
        </div>
      </div>
    </div>
  );
}

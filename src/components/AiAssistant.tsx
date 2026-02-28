import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useLocation } from "react-router-dom";

// Global event for opening the assistant from anywhere
const AI_OPEN_EVENT = "oracle-ai-open";

export function openAiAssistant() {
  window.dispatchEvent(new CustomEvent(AI_OPEN_EVENT));
}

interface AiContext {
  contextType: "wallet" | "token" | "case" | "alert" | "general";
  chain?: string;
  ref?: string;
  dataSnapshots?: Record<string, unknown>;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  default: [
    "Explain what I'm seeing",
    "Summarize key risks",
    "What should I investigate next?",
  ],
  wallet: [
    "Analyze this wallet's behavior",
    "Any suspicious patterns?",
    "Summarize key evidence",
  ],
  token: [
    "Why is this flagged?",
    "Explain holder concentration",
    "Is there wash trading evidence?",
  ],
  case: [
    "Draft a case note",
    "Generate executive summary",
    "Summarize key evidence",
  ],
  alert: [
    "Explain this alert",
    "How severe is this?",
    "What should I do next?",
  ],
};

function detectContext(pathname: string): AiContext {
  if (pathname.startsWith("/intel/")) {
    const address = pathname.split("/intel/")[1];
    return { contextType: "token", ref: address };
  }
  if (pathname.startsWith("/token/")) {
    return { contextType: "token", ref: pathname.split("/token/")[1] };
  }
  if (pathname.startsWith("/cases/")) {
    return { contextType: "case", ref: pathname.split("/cases/")[1] };
  }
  if (pathname === "/server-alerts" || pathname === "/alerts") {
    return { contextType: "alert" };
  }
  return { contextType: "general" };
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, error, send, clear } = useAiAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const context = detectContext(location.pathname);
  const prompts = QUICK_PROMPTS[context.contextType] ?? QUICK_PROMPTS.default;

  // Listen for external open events
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(AI_OPEN_EVENT, handler);
    return () => window.removeEventListener(AI_OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput("");
    send(msg, context);
  };

  return (
    <>
      {/* Panel — centered on screen */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-3 top-[12%] bottom-[12%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] sm:max-h-[70vh] z-50 flex flex-col rounded-2xl border border-white/[0.08] bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
            >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-muted/30">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-semibold flex-1">Oracle AI</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clear}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[50vh] scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <Bot className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Ask me about what you're investigating
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleSend(p)}
                        className="text-[10px] px-2.5 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-xs prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground whitespace-pre-wrap">
                        {m.content}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted/70 rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 text-[10px] text-danger bg-danger/10 border-t border-danger/20">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/[0.06] bg-muted/20">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Oracle AI..."
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

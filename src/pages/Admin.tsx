import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import oracleLogo from "@/assets/oracle-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { motion } from "framer-motion";
import {
  Mail, Lock, Plus, Copy, Check, Trash2, ArrowLeft,
  Activity, Server, Clock, Shield, ToggleLeft, Tag, FileText,
  CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// --- Sub-pages ---

function AdminDashboard() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "API Latency", value: "~320ms", icon: Activity, ok: true },
          { label: "Error Rate (24h)", value: "0.2%", icon: AlertTriangle, ok: true },
          { label: "Alert Runner", value: "Active", icon: Clock, ok: true },
          { label: "Report Generator", value: "Idle", icon: FileText, ok: true },
        ].map((card) => (
          <div key={card.label} className="gradient-card rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{card.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-semibold">{card.value}</span>
              {card.ok ? (
                <CheckCircle className="w-3 h-3 text-success" />
              ) : (
                <XCircle className="w-3 h-3 text-danger" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="gradient-card rounded-lg p-3">
        <h3 className="text-xs font-semibold mb-2">System Status</h3>
        <div className="space-y-1.5">
          {["Moralis API", "Database", "Edge Functions", "Storage"].map((service) => (
            <div key={service} className="flex items-center justify-between py-1">
              <span className="text-xs text-muted-foreground">{service}</span>
              <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30">
                Healthy
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DataProviders() {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const testMoralis = async () => {
    setTesting(true);
    setStatus("idle");
    try {
      const { error } = await supabase.functions.invoke("moralis-proxy", {
        body: { endpoint: "/block/latest", chain: "cronos" },
      });
      setStatus(error ? "error" : "ok");
    } catch {
      setStatus("error");
    }
    setTesting(false);
  };

  return (
    <div className="space-y-3">
      <div className="gradient-card rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-semibold">Moralis</h3>
            <p className="text-[10px] text-muted-foreground">Primary data provider</p>
          </div>
          <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30">
            Configured
          </Badge>
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Chains</span>
            <span className="font-mono">cronos</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">API Key</span>
            <span className="font-mono text-success">••••••••</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={testMoralis} disabled={testing}>
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Test Connection
        </Button>
        {status === "ok" && <p className="text-[10px] text-success mt-1.5 text-center">✓ Connection successful</p>}
        {status === "error" && <p className="text-[10px] text-danger mt-1.5 text-center">✗ Connection failed</p>}
      </div>
    </div>
  );
}

function JobsSchedulers() {
  const [running, setRunning] = useState(false);

  const runNow = async () => {
    setRunning(true);
    try {
      await supabase.functions.invoke("alert-scanner", { body: {} });
    } catch {
      // silent
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {[
        { name: "Alert Scanner", schedule: "Every 60s", lastRun: "Just now" },
        { name: "Report Generator", schedule: "On demand", lastRun: "2h ago" },
      ].map((job) => (
        <div key={job.name} className="gradient-card rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold">{job.name}</h3>
            <Badge variant="outline" className="text-[9px]">Active</Badge>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
            <span>Schedule: {job.schedule}</span>
            <span>Last: {job.lastRun}</span>
          </div>
          {job.name === "Alert Scanner" && (
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Run Now
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureFlags() {
  const [flags, setFlags] = useState({
    bubblemap: true,
    clusters: true,
    aiAssistant: true,
    publicShare: true,
  });

  const toggle = (key: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      {(Object.entries(flags) as [keyof typeof flags, boolean][]).map(([key, enabled]) => (
        <div key={key} className="gradient-card rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
            <p className="text-[10px] text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              enabled ? "bg-success" : "bg-muted"
            }`}
          >
            <motion.div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
              animate={{ left: enabled ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

function LabelsEntities() {
  const labels = [
    { address: "0x145863...eb", tag: "VVS Finance Router", type: "Router" },
    { address: "0xeB5f1...34", tag: "Cronos Bridge", type: "Bridge" },
    { address: "0x7ceb2...a1", tag: "Known CEX", type: "CEX" },
  ];

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mb-2">
        <Plus className="w-3 h-3" />
        Add Label
      </Button>
      {labels.map((l) => (
        <div key={l.address} className="gradient-card rounded-lg p-3 flex items-center gap-3">
          <Tag className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono truncate">{l.address}</p>
            <p className="text-[10px] text-muted-foreground">{l.tag}</p>
          </div>
          <Badge variant="outline" className="text-[9px]">{l.type}</Badge>
        </div>
      ))}
    </div>
  );
}

function InvitationCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { t } = useI18n();

  const fetchCodes = useCallback(async () => {
    const { data } = await supabase
      .from("invitation_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCodes(data);
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const createCode = async () => {
    setLoading(true);
    const code = generateCode();
    await supabase.from("invitation_codes").insert({ code });
    await fetchCodes();
    setLoading(false);
  };

  const deleteCode = async (id: string) => {
    await supabase.from("invitation_codes").delete().eq("id", id);
    await fetchCodes();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button className="gap-2" size="sm" onClick={createCode} disabled={loading}>
          <Plus className="w-3 h-3" />
          {t("admin.generate")}
        </Button>
        <span className="text-[10px] text-muted-foreground">{codes.length} code{codes.length !== 1 ? "s" : ""}</span>
      </div>
      {codes.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">{t("admin.noCodes")}</p>
      ) : (
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-2">
            {codes.map((c) => (
              <CarouselItem key={c.id} className="pl-2 basis-[85%]">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-semibold tracking-wider block">{c.code}</span>
                    <Badge className={`mt-1 ${c.is_used ? "bg-success/10 text-success border-success/20 text-[9px]" : "bg-muted text-muted-foreground border-border text-[9px]"}`}>
                      {c.is_used ? t("admin.used") : t("admin.available")}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyCode(c.code, c.id)}>
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteCode(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </Button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}

// --- Main Admin ---

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();

  const verifyCredentials = async () => {
    setLoginError("");
    const { data, error } = await supabase.functions.invoke("verify-admin-pin", {
      body: { email: email.trim(), password: password.trim() },
    });
    if (error || !data?.valid) {
      setLoginError(t("admin.loginError"));
      return;
    }
    setAuthenticated(true);
    localStorage.setItem("oracle_admin_session", Date.now().toString());
  };

  useEffect(() => {
    const session = localStorage.getItem("oracle_admin_session");
    if (session && Date.now() - parseInt(session) < 3600000) {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm space-y-6 text-center">
          <img src={oracleLogo} alt="Oracle" className="w-20 h-20 mx-auto object-contain" />
          <h1 className="text-xl font-display font-bold text-foreground">{t("admin.title")}</h1>
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder={t("admin.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className="pl-10" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder={t("admin.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verifyCredentials()} autoComplete="off" className="pl-10" />
            </div>
            {loginError && <p className="text-sm text-danger">{loginError}</p>}
            <Button className="w-full" onClick={verifyCredentials} disabled={!email || !password}>
              {t("admin.access")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-4 max-w-lg mx-auto" style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-display font-bold text-foreground">Administration</h1>
        <div className="w-10" />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full grid grid-cols-3 h-8 mb-4">
          <TabsTrigger value="dashboard" className="text-[10px]">Dashboard</TabsTrigger>
          <TabsTrigger value="providers" className="text-[10px]">Providers</TabsTrigger>
          <TabsTrigger value="jobs" className="text-[10px]">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="providers"><DataProviders /></TabsContent>
        <TabsContent value="jobs"><JobsSchedulers /></TabsContent>
      </Tabs>

      <Tabs defaultValue="codes" className="mt-6">
        <TabsList className="w-full grid grid-cols-3 h-8 mb-4">
          <TabsTrigger value="codes" className="text-[10px]">Access Codes</TabsTrigger>
          <TabsTrigger value="flags" className="text-[10px]">Flags</TabsTrigger>
          <TabsTrigger value="labels" className="text-[10px]">Labels</TabsTrigger>
        </TabsList>

        <TabsContent value="codes"><InvitationCodes /></TabsContent>
        <TabsContent value="flags"><FeatureFlags /></TabsContent>
        <TabsContent value="labels"><LabelsEntities /></TabsContent>
      </Tabs>
    </div>
  );
}

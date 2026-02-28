import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// ---------- Report content builder ----------

interface ReportData {
  caseData: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
}

function buildTextReport(report: ReportData): string {
  const c = report.caseData;
  const lines: string[] = [];

  lines.push("═".repeat(60));
  lines.push("ORACLE INTEL — INVESTIGATION REPORT");
  lines.push("═".repeat(60));
  lines.push("");
  lines.push(`Case: ${c.title}`);
  lines.push(`ID: ${c.id}`);
  lines.push(`Status: ${String(c.status).toUpperCase()} | Priority: ${String(c.priority).toUpperCase()}`);
  lines.push(`Chain: ${c.chain}`);
  lines.push(`Created: ${c.created_at}`);
  if (c.description) lines.push(`Description: ${c.description}`);
  if (Array.isArray(c.tags) && c.tags.length > 0) lines.push(`Tags: ${c.tags.join(", ")}`);
  lines.push("");

  // Executive summary
  lines.push("─".repeat(40));
  lines.push("EXECUTIVE SUMMARY");
  lines.push("─".repeat(40));

  const wallets = report.items.filter(i => i.item_type === "wallet");
  const tokens = report.items.filter(i => i.item_type === "token");
  const txs = report.items.filter(i => i.item_type === "tx");
  const alerts = report.items.filter(i => i.item_type === "alert");
  const clusters = report.items.filter(i => i.item_type === "cluster");

  lines.push(`This case involves ${report.items.length} evidence items:`);
  if (wallets.length) lines.push(`  • ${wallets.length} wallet address(es)`);
  if (tokens.length) lines.push(`  • ${tokens.length} token contract(s)`);
  if (txs.length) lines.push(`  • ${txs.length} transaction(s)`);
  if (alerts.length) lines.push(`  • ${alerts.length} alert(s)`);
  if (clusters.length) lines.push(`  • ${clusters.length} cluster analysis(es)`);
  lines.push("");

  // Evidence detail sections
  if (wallets.length) {
    lines.push("─".repeat(40));
    lines.push("WALLET EVIDENCE");
    lines.push("─".repeat(40));
    for (const w of wallets) {
      lines.push(`  Address: ${w.ref}`);
      if (w.title) lines.push(`  Label: ${w.title}`);
      const data = (w.data ?? {}) as Record<string, unknown>;
      if (data.riskFlags) lines.push(`  Risk Flags: ${JSON.stringify(data.riskFlags)}`);
      lines.push("");
    }
  }

  if (tokens.length) {
    lines.push("─".repeat(40));
    lines.push("TOKEN EVIDENCE");
    lines.push("─".repeat(40));
    for (const t of tokens) {
      lines.push(`  Contract: ${t.ref}`);
      if (t.title) lines.push(`  Name: ${t.title}`);
      const data = (t.data ?? {}) as Record<string, unknown>;
      if (data.symbol) lines.push(`  Symbol: ${data.symbol}`);
      if (data.top10Pct !== undefined) lines.push(`  Top 10 Holder %: ${data.top10Pct}`);
      if (data.giniApprox !== undefined) lines.push(`  Gini Index: ${data.giniApprox}`);
      lines.push("");
    }
  }

  if (txs.length) {
    lines.push("─".repeat(40));
    lines.push("TRANSACTION EVIDENCE");
    lines.push("─".repeat(40));
    for (const tx of txs) {
      lines.push(`  Hash: ${tx.ref}`);
      if (tx.title) lines.push(`  Note: ${tx.title}`);
      const data = (tx.data ?? {}) as Record<string, unknown>;
      if (data.value) lines.push(`  Value: ${data.value}`);
      if (data.from) lines.push(`  From: ${data.from}`);
      if (data.to) lines.push(`  To: ${data.to}`);
      lines.push("");
    }
  }

  if (alerts.length) {
    lines.push("─".repeat(40));
    lines.push("ALERT EVIDENCE");
    lines.push("─".repeat(40));
    for (const a of alerts) {
      if (a.title) lines.push(`  Alert: ${a.title}`);
      const data = (a.data ?? {}) as Record<string, unknown>;
      if (data.severity) lines.push(`  Severity: ${data.severity}`);
      if (data.description) lines.push(`  Detail: ${data.description}`);
      lines.push("");
    }
  }

  if (clusters.length) {
    lines.push("─".repeat(40));
    lines.push("CLUSTER ANALYSIS");
    lines.push("─".repeat(40));
    for (const cl of clusters) {
      lines.push(`  Cluster ID: ${cl.ref}`);
      const data = (cl.data ?? {}) as Record<string, unknown>;
      if (data.confidence !== undefined) lines.push(`  Confidence: ${Math.round(Number(data.confidence) * 100)}%`);
      if (data.memberCount) lines.push(`  Members: ${data.memberCount}`);
      if (Array.isArray(data.topSignals)) lines.push(`  Top Signals: ${(data.topSignals as string[]).join(", ")}`);
      lines.push("");
    }
  }

  // Notes
  if (report.notes.length) {
    lines.push("─".repeat(40));
    lines.push("INVESTIGATOR NOTES");
    lines.push("─".repeat(40));
    for (const n of report.notes) {
      lines.push(`  [${n.created_at}]`);
      lines.push(`  ${n.body}`);
      lines.push("");
    }
  }

  // Timeline
  if (report.timeline.length) {
    lines.push("─".repeat(40));
    lines.push("TIMELINE");
    lines.push("─".repeat(40));
    for (const t of report.timeline) {
      lines.push(`  ${t.time} | ${t.type} | ${t.title}`);
      if (t.details) lines.push(`    ${t.details}`);
    }
    lines.push("");
  }

  // Disclaimer
  lines.push("═".repeat(60));
  lines.push("DISCLAIMER");
  lines.push("═".repeat(60));
  lines.push("This report contains on-chain intelligence signals and");
  lines.push("probabilistic risk indicators. All findings are based on");
  lines.push("publicly available blockchain data. Risk flags represent");
  lines.push("statistical patterns, not definitive conclusions.");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Oracle Intel Platform — ${c.chain}`);

  return lines.join("\n");
}

function buildJsonExport(report: ReportData): Record<string, unknown> {
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    platform: "Oracle Intel",
    case: report.caseData,
    evidence: report.items,
    notes: report.notes,
    timeline: report.timeline,
    disclaimer: "This report contains on-chain intelligence signals and probabilistic risk indicators based on publicly available blockchain data.",
  };
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { case_id } = body;
      if (!case_id) return json({ error: "case_id required" }, 400);

      // Create job
      const { data: job, error: jobErr } = await supabase
        .from("report_jobs")
        .insert({ case_id, status: "running" })
        .select()
        .single();
      if (jobErr || !job) throw new Error(jobErr?.message ?? "Failed to create job");

      // Fetch all case data
      const [caseRes, itemsRes, notesRes] = await Promise.all([
        supabase.from("cases").select("*").eq("id", case_id).single(),
        supabase.from("case_items").select("*").eq("case_id", case_id).order("created_at"),
        supabase.from("case_notes").select("*").eq("case_id", case_id).order("created_at"),
      ]);

      if (!caseRes.data) {
        await supabase.from("report_jobs").update({ status: "failed", error_message: "Case not found" }).eq("id", job.id);
        return json({ error: "Case not found" }, 404);
      }

      // Build timeline
      const timeline: Array<Record<string, unknown>> = [];
      timeline.push({
        time: caseRes.data.created_at,
        type: "case_created",
        title: "Case opened",
        details: caseRes.data.title,
      });

      for (const item of itemsRes.data ?? []) {
        timeline.push({
          time: item.created_at,
          type: item.item_type,
          title: `Evidence: ${item.item_type}`,
          details: item.title ?? item.ref,
        });
      }

      for (const note of notesRes.data ?? []) {
        timeline.push({
          time: note.created_at,
          type: "note",
          title: "Note added",
          details: String(note.body).slice(0, 200),
        });
      }

      timeline.sort((a, b) => new Date(String(a.time)).getTime() - new Date(String(b.time)).getTime());

      const reportData: ReportData = {
        caseData: caseRes.data,
        items: itemsRes.data ?? [],
        notes: notesRes.data ?? [],
        timeline,
      };

      // Generate text report (as PDF-like text file)
      const textContent = buildTextReport(reportData);
      const jsonContent = JSON.stringify(buildJsonExport(reportData), null, 2);

      // Upload to storage
      const timestamp = Date.now();
      const pdfPath = `case-${case_id}/report-${timestamp}.txt`;
      const jsonPath = `case-${case_id}/report-${timestamp}.json`;

      const [pdfUpload, jsonUpload] = await Promise.all([
        supabase.storage.from("reports").upload(pdfPath, new Blob([textContent], { type: "text/plain" }), {
          contentType: "text/plain",
          upsert: true,
        }),
        supabase.storage.from("reports").upload(jsonPath, new Blob([jsonContent], { type: "application/json" }), {
          contentType: "application/json",
          upsert: true,
        }),
      ]);

      if (pdfUpload.error || jsonUpload.error) {
        const errMsg = pdfUpload.error?.message ?? jsonUpload.error?.message ?? "Upload failed";
        await supabase.from("report_jobs").update({ status: "failed", error_message: errMsg }).eq("id", job.id);
        return json({ error: errMsg }, 500);
      }

      const { data: pdfUrl } = supabase.storage.from("reports").getPublicUrl(pdfPath);
      const { data: jsonUrl } = supabase.storage.from("reports").getPublicUrl(jsonPath);

      await supabase.from("report_jobs").update({
        status: "done",
        output_url: pdfUrl.publicUrl,
        output_json_url: jsonUrl.publicUrl,
      }).eq("id", job.id);

      return json({
        job_id: job.id,
        status: "done",
        output_url: pdfUrl.publicUrl,
        output_json_url: jsonUrl.publicUrl,
      });
    }

    if (action === "get_status") {
      const { job_id } = body;
      if (!job_id) return json({ error: "job_id required" }, 400);
      const { data, error: e } = await supabase.from("report_jobs").select("*").eq("id", job_id).single();
      if (e) return json({ error: "Job not found" }, 404);
      return json(data);
    }

    if (action === "list_jobs") {
      const { case_id } = body;
      if (!case_id) return json({ error: "case_id required" }, 400);
      const { data } = await supabase.from("report_jobs").select("*").eq("case_id", case_id).order("created_at", { ascending: false });
      return json(data ?? []);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});

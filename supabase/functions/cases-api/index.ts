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

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

const VALID_STATUSES = ["open", "triaged", "closed"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_ITEM_TYPES = ["wallet", "token", "tx", "cluster", "alert", "note", "snapshot"];
const EVM_ADDR = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH = /^0x[a-fA-F0-9]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRef(itemType: string, ref: string): boolean {
  switch (itemType) {
    case "wallet":
    case "token":
      return EVM_ADDR.test(ref);
    case "tx":
      return TX_HASH.test(ref);
    case "cluster":
    case "alert":
      return UUID_RE.test(ref);
    case "note":
    case "snapshot":
      return ref.length > 0 && ref.length < 500;
    default:
      return false;
  }
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const body = req.method !== "GET" ? await req.json() : {};
    const { action } = body;

    // ===== CASES CRUD =====

    if (action === "list_cases") {
      const { status, priority, limit = 50, offset = 0 } = body;
      let query = supabase.from("cases").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (status) query = query.eq("status", status);
      if (priority) query = query.eq("priority", priority);
      const { data, error: e } = await query;
      if (e) throw new Error(e.message);
      return json(data);
    }

    if (action === "get_case") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");
      const { data, error: e } = await supabase.from("cases").select("*").eq("id", case_id).single();
      if (e) return err("Case not found", 404);
      return json(data);
    }

    if (action === "create_case") {
      const { title, description = "", chain = "cronos", priority = "medium", tags = [] } = body;
      if (!title || typeof title !== "string" || title.trim().length === 0) return err("title required");
      if (title.length > 200) return err("title too long (max 200)");
      if (description.length > 2000) return err("description too long (max 2000)");
      if (priority && !VALID_PRIORITIES.includes(priority)) return err("Invalid priority");

      const { data, error: e } = await supabase.from("cases").insert({
        title: title.trim(),
        description: description.trim(),
        chain,
        priority,
        tags,
      }).select().single();
      if (e) throw new Error(e.message);
      return json(data, 201);
    }

    if (action === "update_case") {
      const { case_id, ...updates } = body;
      if (!case_id) return err("case_id required");
      const allowed: Record<string, unknown> = {};
      if (updates.title !== undefined) {
        if (typeof updates.title !== "string" || updates.title.trim().length === 0) return err("Invalid title");
        allowed.title = updates.title.trim();
      }
      if (updates.description !== undefined) allowed.description = String(updates.description).slice(0, 2000);
      if (updates.status !== undefined) {
        if (!VALID_STATUSES.includes(updates.status)) return err("Invalid status");
        allowed.status = updates.status;
      }
      if (updates.priority !== undefined) {
        if (!VALID_PRIORITIES.includes(updates.priority)) return err("Invalid priority");
        allowed.priority = updates.priority;
      }
      if (updates.tags !== undefined) allowed.tags = updates.tags;

      const { data, error: e } = await supabase.from("cases").update(allowed).eq("id", case_id).select().single();
      if (e) return err(e.message);
      return json(data);
    }

    if (action === "delete_case") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");
      const { error: e } = await supabase.from("cases").delete().eq("id", case_id);
      if (e) return err(e.message);
      return json({ ok: true });
    }

    // ===== CASE ITEMS =====

    if (action === "list_items") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");
      const { data, error: e } = await supabase.from("case_items").select("*").eq("case_id", case_id).order("created_at", { ascending: true });
      if (e) throw new Error(e.message);
      return json(data);
    }

    if (action === "add_item") {
      const { case_id, item_type, ref, title, data: itemData = {}, chain = "cronos" } = body;
      if (!case_id) return err("case_id required");
      if (!VALID_ITEM_TYPES.includes(item_type)) return err(`Invalid item_type. Must be one of: ${VALID_ITEM_TYPES.join(", ")}`);
      if (!ref || !validateRef(item_type, ref)) return err(`Invalid ref for type ${item_type}`);

      const { data, error: e } = await supabase.from("case_items").insert({
        case_id,
        item_type,
        chain,
        ref,
        title: title ?? null,
        data: itemData,
      }).select().single();

      if (e) {
        if (e.code === "23505") return err("This evidence already exists in this case");
        throw new Error(e.message);
      }
      return json(data, 201);
    }

    if (action === "remove_item") {
      const { item_id } = body;
      if (!item_id) return err("item_id required");
      const { error: e } = await supabase.from("case_items").delete().eq("id", item_id);
      if (e) return err(e.message);
      return json({ ok: true });
    }

    // ===== NOTES =====

    if (action === "list_notes") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");
      const { data, error: e } = await supabase.from("case_notes").select("*").eq("case_id", case_id).order("created_at", { ascending: true });
      if (e) throw new Error(e.message);
      return json(data);
    }

    if (action === "add_note") {
      const { case_id, body: noteBody } = body;
      if (!case_id) return err("case_id required");
      if (!noteBody || typeof noteBody !== "string" || noteBody.trim().length === 0) return err("Note body required");
      if (noteBody.length > 5000) return err("Note too long (max 5000 chars)");

      const { data, error: e } = await supabase.from("case_notes").insert({
        case_id,
        body: noteBody.trim(),
      }).select().single();
      if (e) throw new Error(e.message);
      return json(data, 201);
    }

    if (action === "delete_note") {
      const { note_id } = body;
      if (!note_id) return err("note_id required");
      const { error: e } = await supabase.from("case_notes").delete().eq("id", note_id);
      if (e) return err(e.message);
      return json({ ok: true });
    }

    // ===== SHARE LINKS =====

    if (action === "enable_share") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");

      // Check existing
      const { data: existing } = await supabase.from("case_share_links").select("*").eq("case_id", case_id).eq("is_enabled", true).maybeSingle();
      if (existing) return json(existing);

      const { data, error: e } = await supabase.from("case_share_links").insert({ case_id }).select().single();
      if (e) throw new Error(e.message);
      return json(data, 201);
    }

    if (action === "disable_share") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");
      await supabase.from("case_share_links").update({ is_enabled: false }).eq("case_id", case_id);
      return json({ ok: true });
    }

    if (action === "get_public_case") {
      const { public_token } = body;
      if (!public_token) return err("public_token required");

      const { data: link } = await supabase.from("case_share_links").select("*").eq("public_token", public_token).eq("is_enabled", true).maybeSingle();
      if (!link) return err("Case not found or sharing disabled", 404);

      const { data: caseData } = await supabase.from("cases").select("id, title, description, chain, status, priority, tags, created_at").eq("id", link.case_id).single();
      const { data: items } = await supabase.from("case_items").select("*").eq("case_id", link.case_id).order("created_at");
      const { data: notes } = await supabase.from("case_notes").select("id, body, created_at").eq("case_id", link.case_id).order("created_at");

      return json({ case: caseData, items: items ?? [], notes: notes ?? [] });
    }

    // ===== TIMELINE =====

    if (action === "get_timeline") {
      const { case_id } = body;
      if (!case_id) return err("case_id required");

      const { data: caseData } = await supabase.from("cases").select("created_at, title").eq("id", case_id).single();
      const { data: items } = await supabase.from("case_items").select("*").eq("case_id", case_id).order("created_at");
      const { data: notes } = await supabase.from("case_notes").select("*").eq("case_id", case_id).order("created_at");

      interface TimelineEntry {
        time: string;
        type: string;
        title: string;
        details: string;
        evidenceRefs: string[];
      }

      const timeline: TimelineEntry[] = [];

      if (caseData) {
        timeline.push({
          time: caseData.created_at,
          type: "case_created",
          title: "Case opened",
          details: caseData.title,
          evidenceRefs: [],
        });
      }

      for (const item of items ?? []) {
        const itemData = (item.data ?? {}) as Record<string, unknown>;
        let details = item.title ?? `${item.item_type}: ${item.ref}`;
        if (itemData.timestamp) {
          details += ` (on-chain: ${itemData.timestamp})`;
        }

        timeline.push({
          time: item.created_at,
          type: item.item_type,
          title: `Evidence added: ${item.item_type}`,
          details,
          evidenceRefs: [item.ref],
        });
      }

      for (const note of notes ?? []) {
        timeline.push({
          time: note.created_at,
          type: "note",
          title: "Note added",
          details: note.body.slice(0, 200),
          evidenceRefs: [],
        });
      }

      timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      return json(timeline);
    }

    // ===== CREATE CASE FROM ALERT =====

    if (action === "create_from_alert") {
      const { alert_id } = body;
      if (!alert_id) return err("alert_id required");

      const { data: alert, error: alertErr } = await supabase.from("alerts").select("*").eq("id", alert_id).single();
      if (alertErr || !alert) return err("Alert not found", 404);

      // Create case
      const { data: newCase, error: caseErr } = await supabase.from("cases").insert({
        title: alert.title,
        description: alert.description || `Case created from alert: ${alert.title}`,
        chain: alert.chain,
        priority: alert.severity === "critical" ? "critical" : alert.severity === "high" ? "high" : "medium",
        tags: [alert.scope, alert.severity],
      }).select().single();

      if (caseErr || !newCase) throw new Error(caseErr?.message ?? "Failed to create case");

      // Add alert as evidence
      const itemsToInsert: Array<{
        case_id: string;
        item_type: string;
        chain: string;
        ref: string;
        title: string;
        data: Record<string, unknown>;
      }> = [];

      itemsToInsert.push({
        case_id: newCase.id,
        item_type: "alert",
        chain: alert.chain,
        ref: alert.id,
        title: alert.title,
        data: {
          severity: alert.severity,
          description: alert.description,
          evidence: alert.evidence,
          created_at: alert.created_at,
        },
      });

      // Auto-attach wallet/token from alert
      const evidence = (alert.evidence ?? {}) as Record<string, unknown>;
      if (alert.subject && EVM_ADDR.test(alert.subject)) {
        const subjectType = alert.scope === "token" ? "token" : "wallet";
        itemsToInsert.push({
          case_id: newCase.id,
          item_type: subjectType,
          chain: alert.chain,
          ref: alert.subject,
          title: `${subjectType} from alert`,
          data: { source: "auto-attached from alert" },
        });
      }

      // Attach tx hashes from evidence
      const txHashes = evidence.txHashes ?? evidence.tx_hashes;
      if (Array.isArray(txHashes)) {
        for (const hash of txHashes.slice(0, 5)) {
          if (TX_HASH.test(String(hash))) {
            itemsToInsert.push({
              case_id: newCase.id,
              item_type: "tx",
              chain: alert.chain,
              ref: String(hash),
              title: "Transaction from alert evidence",
              data: { source: "auto-attached from alert" },
            });
          }
        }
      }

      if (itemsToInsert.length > 0) {
        await supabase.from("case_items").insert(itemsToInsert);
      }

      return json({ case_id: newCase.id, items_added: itemsToInsert.length }, 201);
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});

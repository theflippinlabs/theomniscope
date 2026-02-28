import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Case,
  CaseItem,
  CaseNote,
  CaseShareLink,
  ReportJob,
  TimelineEntry,
  CaseStatus,
  CasePriority,
  CaseItemType,
} from "@/lib/case.types";

// ---------- Generic invoker ----------

async function invokeCases<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cases-api", { body });
  if (error) throw new Error(error.message ?? "Cases API request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

async function invokeReports<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("report-generator", { body });
  if (error) throw new Error(error.message ?? "Report API request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ---------- Cases CRUD hooks ----------

export function useCasesList(status?: CaseStatus, priority?: CasePriority) {
  return useQuery<Case[]>({
    queryKey: ["cases", status, priority],
    queryFn: () => invokeCases<Case[]>({ action: "list_cases", status, priority }),
    staleTime: 30_000,
  });
}

export function useCase(caseId: string) {
  return useQuery<Case>({
    queryKey: ["case", caseId],
    queryFn: () => invokeCases<Case>({ action: "get_case", case_id: caseId }),
    enabled: !!caseId,
    staleTime: 15_000,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; description?: string; chain?: string; priority?: CasePriority; tags?: string[] }) =>
      invokeCases<Case>({ action: "create_case", ...params }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); },
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { case_id: string; title?: string; description?: string; status?: CaseStatus; priority?: CasePriority; tags?: string[] }) =>
      invokeCases<Case>({ action: "update_case", ...params }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["case", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => invokeCases<{ ok: boolean }>({ action: "delete_case", case_id: caseId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); },
  });
}

// ---------- Case items hooks ----------

export function useCaseItems(caseId: string) {
  return useQuery<CaseItem[]>({
    queryKey: ["case-items", caseId],
    queryFn: () => invokeCases<CaseItem[]>({ action: "list_items", case_id: caseId }),
    enabled: !!caseId,
    staleTime: 15_000,
  });
}

export function useAddCaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { case_id: string; item_type: CaseItemType; ref: string; title?: string; data?: Record<string, unknown>; chain?: string }) =>
      invokeCases<CaseItem>({ action: "add_item", ...params }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["case-items", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["case-timeline", vars.case_id] });
    },
  });
}

export function useRemoveCaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { item_id: string; case_id: string }) =>
      invokeCases<{ ok: boolean }>({ action: "remove_item", item_id: params.item_id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["case-items", vars.case_id] });
    },
  });
}

// ---------- Notes hooks ----------

export function useCaseNotes(caseId: string) {
  return useQuery<CaseNote[]>({
    queryKey: ["case-notes", caseId],
    queryFn: () => invokeCases<CaseNote[]>({ action: "list_notes", case_id: caseId }),
    enabled: !!caseId,
    staleTime: 15_000,
  });
}

export function useAddCaseNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { case_id: string; body: string }) =>
      invokeCases<CaseNote>({ action: "add_note", ...params }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["case-notes", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["case-timeline", vars.case_id] });
    },
  });
}

export function useDeleteCaseNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { note_id: string; case_id: string }) =>
      invokeCases<{ ok: boolean }>({ action: "delete_note", note_id: params.note_id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["case-notes", vars.case_id] });
    },
  });
}

// ---------- Share links ----------

export function useEnableShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => invokeCases<CaseShareLink>({ action: "enable_share", case_id: caseId }),
    onSuccess: (_, caseId) => { qc.invalidateQueries({ queryKey: ["case", caseId] }); },
  });
}

export function useDisableShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => invokeCases<{ ok: boolean }>({ action: "disable_share", case_id: caseId }),
    onSuccess: (_, caseId) => { qc.invalidateQueries({ queryKey: ["case", caseId] }); },
  });
}

// ---------- Timeline ----------

export function useCaseTimeline(caseId: string) {
  return useQuery<TimelineEntry[]>({
    queryKey: ["case-timeline", caseId],
    queryFn: () => invokeCases<TimelineEntry[]>({ action: "get_timeline", case_id: caseId }),
    enabled: !!caseId,
    staleTime: 15_000,
  });
}

// ---------- Reports ----------

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => invokeReports<ReportJob>({ action: "generate", case_id: caseId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["report-jobs", data.case_id] });
    },
  });
}

export function useReportJobs(caseId: string) {
  return useQuery<ReportJob[]>({
    queryKey: ["report-jobs", caseId],
    queryFn: () => invokeReports<ReportJob[]>({ action: "list_jobs", case_id: caseId }),
    enabled: !!caseId,
    staleTime: 10_000,
  });
}

// ---------- Create case from alert ----------

export function useCreateCaseFromAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => invokeCases<{ case_id: string; items_added: number }>({ action: "create_from_alert", alert_id: alertId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); },
  });
}

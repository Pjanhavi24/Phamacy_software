import apiClient from "@/lib/api";

/**
 * Frontend service methods for the workspace (multi-tab) backend.
 * The store holds the source of truth in-memory + localStorage and syncs
 * through these methods so the session persists per user across refresh/devices.
 */

export interface WorkspaceTabDTO {
  instanceKey: string;
  module: string;
  title: string;
  href: string;
  pinned: boolean;
  position: number;
  isActive?: boolean;
  dirty?: boolean;
  state?: Record<string, unknown> | null;
  closedAt?: string | null;
}

export interface WorkspaceResponse {
  tabs: WorkspaceTabDTO[];
  recentlyClosed: WorkspaceTabDTO[];
}

/** Load the persisted workspace for the signed-in user. */
export async function fetchWorkspace(): Promise<WorkspaceResponse> {
  const res = await apiClient.get("/workspace");
  return {
    tabs: res.data?.tabs ?? [],
    recentlyClosed: res.data?.recentlyClosed ?? [],
  };
}

/** Replace the open-tab set (debounced bulk sync). */
export async function saveWorkspace(
  tabs: WorkspaceTabDTO[]
): Promise<WorkspaceTabDTO[]> {
  const res = await apiClient.put("/workspace", { tabs });
  return res.data?.tabs ?? [];
}

/** Soft-close a single tab server-side (also writes an audit log). */
export async function closeWorkspaceTab(instanceKey: string): Promise<void> {
  await apiClient.delete(`/workspace/${encodeURIComponent(instanceKey)}`);
}

/** Restore a recently-closed tab server-side. */
export async function restoreWorkspaceTab(
  instanceKey: string
): Promise<WorkspaceTabDTO | null> {
  const res = await apiClient.post("/workspace/restore", { instanceKey });
  return res.data?.tab ?? null;
}

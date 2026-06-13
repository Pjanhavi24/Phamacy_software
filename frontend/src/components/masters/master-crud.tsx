"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageContainer,
  PageHeader,
  Panel,
  Spinner,
  TableEmpty,
  SearchInput,
  ds,
} from "@/components/design-system";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MasterColumn {
  key: string;
  label: string;
  mono?: boolean;
  className?: string;
}

export interface MasterField {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  /** Shown as read-only (e.g. an auto-assigned code on edit). */
  readOnly?: boolean;
  full?: boolean; // span both columns
}

type Row = Record<string, any>;

/** Reusable master maintenance screen: searchable list + add/edit/delete. */
export function MasterCrud({
  endpoint,
  icon: Icon,
  noun,
  addLabel,
  columns,
  fields,
}: {
  endpoint: string; // e.g. "/masters/generics"
  icon: LucideIcon;
  noun: string; // e.g. "generic groups"
  addLabel: string; // e.g. "Add Generic Group"
  columns: MasterColumn[];
  fields: MasterField[];
}) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Row | null>(null); // null = closed
  const limit = 50;

  const { data, isLoading, isFetching } = useQuery<{ items: Row[]; total: number }>({
    queryKey: [endpoint, search, page],
    queryFn: () =>
      apiClient.get(endpoint, { params: { search: search || undefined, page, limit } }).then((r) => r.data),
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  const save = useMutation({
    mutationFn: (f: Row) =>
      f.id ? apiClient.put(`${endpoint}/${f.id}`, f) : apiClient.post(endpoint, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Saved");
      setForm(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not save"),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Could not delete"),
  });

  const runSearch = (v: string) => {
    setSearchInput(v);
    setSearch(v);
    setPage(1);
  };

  const submit = () => {
    if (!form) return;
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? "").trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    save.mutate(form);
  };

  return (
    <PageContainer className="flex h-full flex-col space-y-2">
      <PageHeader
        icon={Icon}
        actions={
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchInput}
                onChange={runSearch}
                placeholder={`Search ${noun}…`}
                className="w-72"
                loading={isFetching}
              />
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40">
                {total.toLocaleString()} {noun}
              </span>
            </div>
            <button className={cn(ds.btnPrimary, "h-8 px-3 text-xs")} onClick={() => setForm({})}>
              <Plus className="h-3.5 w-3.5" /> {addLabel}
            </button>
          </div>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="text-xs [&_td]:py-1 [&_th]:h-8">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="p-0">
                    <Spinner />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="p-0">
                    <TableEmpty icon={Database} title={`No ${noun} found`} description="Add one or change the search." />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
                    onClick={() => setForm({ ...row })}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn(
                          c.mono && "whitespace-nowrap font-mono font-medium text-blue-600",
                          !c.mono && "text-gray-800 dark:text-gray-200",
                          c.className
                        )}
                      >
                        {row[c.key] === null || row[c.key] === undefined || row[c.key] === "" ? "—" : String(row[c.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm({ ...row });
                          }}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete this ${noun.replace(/s$/, "")}?`)) del.mutate(row.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <span>
            Page {page} of {pages.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded border border-gray-300 dark:border-gray-700",
                page <= 1 ? "opacity-40" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded border border-gray-300 dark:border-gray-700",
                page >= pages ? "opacity-40" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Panel>

      {form && (
        <FormModal
          title={form.id ? `Edit ${addLabel.replace(/^Add /, "")}` : addLabel}
          fields={fields}
          form={form}
          setForm={setForm}
          onClose={() => setForm(null)}
          onSubmit={submit}
          saving={save.isPending}
        />
      )}
    </PageContainer>
  );
}

function FormModal({
  title,
  fields,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
}: {
  title: string;
  fields: MasterField[];
  form: Row;
  setForm: (f: Row) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
          {fields.map((f) => (
            <div key={f.key} className={f.full || f.type === "textarea" ? "col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === "select" ? (
                <select
                  className={ds.field}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  className={cn(ds.field, "h-20 py-2")}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  className={ds.field}
                  value={form[f.key] ?? ""}
                  placeholder={f.placeholder}
                  readOnly={f.readOnly}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button className={ds.btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button className={ds.btnPrimary} onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

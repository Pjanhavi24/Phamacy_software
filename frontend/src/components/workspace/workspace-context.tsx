"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  fetchWorkspace,
  saveWorkspace,
  closeWorkspaceTab,
  restoreWorkspaceTab,
  type WorkspaceTabDTO,
} from "@/lib/workspace-api";
import { getModule, moduleForPath, titleForPath } from "./modules";

export interface Tab {
  instanceKey: string;
  module: string;
  title: string;
  href: string;
  pinned: boolean;
  dirty: boolean;
}

interface WorkspaceContextValue {
  tabs: Tab[];
  recentlyClosed: Tab[];
  activeKey: string | null;
  openModule: (moduleKey: string) => void;
  activateTab: (key: string) => void;
  closeTab: (key: string) => void;
  closeOthers: (key: string) => void;
  duplicateTab: (key: string) => void;
  renameTab: (key: string, title: string) => void;
  togglePin: (key: string) => void;
  restoreTab: (key: string) => void;
  setDirty: (key: string, dirty: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LS_KEY = "pharma_workspace_v1";
const SYNC_DEBOUNCE_MS = 800;
const RECENT_LIMIT = 15;

const basePath = (href: string) => href.split("?")[0];
const randKey = (prefix: string) =>
  `${prefix}:${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

function dtoToTab(d: WorkspaceTabDTO): Tab {
  return {
    instanceKey: d.instanceKey,
    module: d.module,
    title: d.title,
    href: d.href,
    pinned: !!d.pinned,
    dirty: !!d.dirty,
  };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [recentlyClosed, setRecentlyClosed] = useState<Tab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Refs that always mirror the latest values for use inside effects/handlers.
  const tabsRef = useRef<Tab[]>([]);
  const activeRef = useRef<string | null>(null);
  const hydratingRef = useRef(true);
  // pathname we navigated to programmatically (tab click) — skip reconcile once.
  const programmaticRef = useRef<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  tabsRef.current = tabs;
  activeRef.current = activeKey;

  // ---- Hydration: localStorage first (instant), then backend (authoritative).
  useEffect(() => {
    let cancelled = false;
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as {
          tabs?: Tab[];
          recentlyClosed?: Tab[];
          activeKey?: string | null;
        };
        if (parsed.tabs?.length) {
          setTabs(parsed.tabs);
          setRecentlyClosed(parsed.recentlyClosed ?? []);
          setActiveKey(parsed.activeKey ?? parsed.tabs[0].instanceKey);
        }
      }
    } catch {
      /* ignore corrupt cache */
    }

    (async () => {
      try {
        const remote = await fetchWorkspace();
        if (cancelled) return;
        if (remote.tabs.length) {
          setTabs(remote.tabs.map(dtoToTab));
          const act =
            remote.tabs.find((t) => t.isActive)?.instanceKey ??
            remote.tabs[0].instanceKey;
          setActiveKey(act);
        }
        if (remote.recentlyClosed.length) {
          setRecentlyClosed(remote.recentlyClosed.map(dtoToTab));
        }
      } catch {
        /* offline / unauthenticated — localStorage stands in */
      } finally {
        if (!cancelled) {
          // Allow one reconcile pass for the current route after hydration.
          // Never morph a restored tab on first load — focus or create only.
          hydratingRef.current = false;
          reconcileToPath(pathname, false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Persist on every change (localStorage immediately + debounced backend).
  useEffect(() => {
    if (hydratingRef.current) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ tabs, recentlyClosed, activeKey })
      );
    } catch {
      /* quota — non-fatal */
    }

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const payload: WorkspaceTabDTO[] = tabs.map((t, i) => ({
        instanceKey: t.instanceKey,
        module: t.module,
        title: t.title,
        href: t.href,
        pinned: t.pinned,
        position: i,
        isActive: t.instanceKey === activeRef.current,
        dirty: t.dirty,
      }));
      saveWorkspace(payload).catch(() => {
        /* sync best-effort; localStorage remains the fallback */
      });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [tabs, recentlyClosed, activeKey]);

  // ---- Map an external navigation (sidebar / back button) to a tab.
  // Behavior: if the CURRENT tab is untouched (no unsaved work) and not pinned,
  // reuse it for the new module; otherwise open the module in a new tab. An
  // already-open tab for the same module is focused instead of duplicated.
  const reconcileToPath = useCallback((path: string, morph: boolean) => {
    const mod = moduleForPath(path);
    const active = tabsRef.current.find(
      (t) => t.instanceKey === activeRef.current
    );

    // Already showing this module in the active tab → nothing to do.
    if (active && basePath(active.href) === path) return;

    // Another open tab already shows this module → focus it (no duplicate).
    const existing = tabsRef.current.find((t) => basePath(t.href) === path);
    if (existing) {
      setActiveKey(existing.instanceKey);
      return;
    }

    // No tab shows this module yet.
    // Reuse the current tab when it's empty/untouched and not pinned…
    if (morph && active && !active.dirty && !active.pinned) {
      setTabs((prev) =>
        prev.map((t) =>
          t.instanceKey === active.instanceKey
            ? {
                ...t,
                module: mod?.key ?? "page",
                title: mod?.label ?? titleForPath(path),
                href: path,
              }
            : t
        )
      );
      return; // active key stays the same
    }

    // …otherwise open it in a brand-new tab.
    const key = `path:${path}`;
    const tab: Tab = {
      instanceKey: key,
      module: mod?.key ?? "page",
      title: mod?.label ?? titleForPath(path),
      href: path,
      pinned: false,
      dirty: false,
    };
    setTabs((prev) =>
      prev.some((t) => t.instanceKey === key) ? prev : [...prev, tab]
    );
    setActiveKey(key);
  }, []);

  // ---- React to route changes.
  useEffect(() => {
    if (hydratingRef.current) return;
    if (programmaticRef.current === pathname) {
      programmaticRef.current = null;
      return;
    }
    programmaticRef.current = null;
    reconcileToPath(pathname, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ---- Warn on unload if any tab has unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (tabsRef.current.some((t) => t.dirty)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ---- Navigation helper used by tab actions.
  const navigate = useCallback(
    (key: string, href: string) => {
      programmaticRef.current = basePath(href);
      setActiveKey(key);
      router.push(href);
    },
    [router]
  );

  // ---- Public operations -------------------------------------------------
  const openModule = useCallback(
    (moduleKey: string) => {
      const mod = getModule(moduleKey);
      if (!mod) return;
      const key = randKey(moduleKey);
      const count =
        tabsRef.current.filter((t) => t.module === moduleKey).length + 1;
      const tab: Tab = {
        instanceKey: key,
        module: moduleKey,
        title: mod.multi && count > 1 ? `${mod.label} #${count}` : mod.label,
        href: `${mod.baseHref}?wt=${key}`,
        pinned: false,
        dirty: false,
      };
      setTabs((prev) => [...prev, tab]);
      navigate(key, tab.href);
    },
    [navigate]
  );

  const activateTab = useCallback(
    (key: string) => {
      const tab = tabsRef.current.find((t) => t.instanceKey === key);
      if (tab) navigate(key, tab.href);
    },
    [navigate]
  );

  const removeAndFocus = useCallback(
    (key: string) => {
      const list = tabsRef.current;
      const idx = list.findIndex((t) => t.instanceKey === key);
      const closing = list[idx];
      if (!closing) return;
      const remaining = list.filter((t) => t.instanceKey !== key);

      setTabs(remaining);
      setRecentlyClosed((prev) =>
        [{ ...closing, dirty: false }, ...prev.filter((t) => t.instanceKey !== key)].slice(
          0,
          RECENT_LIMIT
        )
      );
      // server-side soft-close + audit (best effort)
      closeWorkspaceTab(key).catch(() => {});

      if (activeRef.current === key) {
        const neighbor = remaining[idx] ?? remaining[idx - 1] ?? remaining[0];
        if (neighbor) navigate(neighbor.instanceKey, neighbor.href);
        else {
          setActiveKey(null);
          router.push("/billing");
        }
      }
    },
    [navigate, router]
  );

  const closeTab = useCallback(
    (key: string) => {
      const tab = tabsRef.current.find((t) => t.instanceKey === key);
      if (tab?.dirty) {
        const ok = window.confirm(
          `"${tab.title}" has unsaved changes. Close it anyway?`
        );
        if (!ok) return;
      }
      removeAndFocus(key);
    },
    [removeAndFocus]
  );

  const closeOthers = useCallback(
    (key: string) => {
      const others = tabsRef.current.filter(
        (t) => t.instanceKey !== key && !t.pinned
      );
      const dirty = others.filter((t) => t.dirty);
      if (
        dirty.length &&
        !window.confirm(
          `${dirty.length} tab(s) have unsaved changes. Close them anyway?`
        )
      )
        return;
      const keep = tabsRef.current.filter(
        (t) => t.instanceKey === key || t.pinned
      );
      setRecentlyClosed((prev) =>
        [...others.map((t) => ({ ...t, dirty: false })), ...prev].slice(
          0,
          RECENT_LIMIT
        )
      );
      others.forEach((t) => closeWorkspaceTab(t.instanceKey).catch(() => {}));
      setTabs(keep);
      const tab = keep.find((t) => t.instanceKey === key);
      if (tab) navigate(key, tab.href);
    },
    [navigate]
  );

  const duplicateTab = useCallback(
    (key: string) => {
      const src = tabsRef.current.find((t) => t.instanceKey === key);
      if (!src) return;
      const newKey = randKey(src.module);
      const dup: Tab = {
        ...src,
        instanceKey: newKey,
        title: `${src.title} (copy)`,
        href: `${basePath(src.href)}?wt=${newKey}`,
        pinned: false,
        dirty: false,
      };
      setTabs((prev) => {
        const i = prev.findIndex((t) => t.instanceKey === key);
        const next = [...prev];
        next.splice(i + 1, 0, dup);
        return next;
      });
      navigate(newKey, dup.href);
    },
    [navigate]
  );

  const renameTab = useCallback((key: string, title: string) => {
    const clean = title.trim().slice(0, 80);
    if (!clean) return;
    setTabs((prev) =>
      prev.map((t) => (t.instanceKey === key ? { ...t, title: clean } : t))
    );
  }, []);

  const togglePin = useCallback((key: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.instanceKey === key ? { ...t, pinned: !t.pinned } : t))
    );
  }, []);

  const restoreTab = useCallback(
    (key: string) => {
      const tab = recentlyClosed.find((t) => t.instanceKey === key);
      if (!tab) return;
      setRecentlyClosed((prev) => prev.filter((t) => t.instanceKey !== key));
      setTabs((prev) =>
        prev.some((t) => t.instanceKey === key) ? prev : [...prev, tab]
      );
      restoreWorkspaceTab(key).catch(() => {});
      navigate(key, tab.href);
    },
    [recentlyClosed, navigate]
  );

  const setDirty = useCallback((key: string, dirty: boolean) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.instanceKey === key && t.dirty !== dirty ? { ...t, dirty } : t
      )
    );
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        tabs,
        recentlyClosed,
        activeKey,
        openModule,
        activateTab,
        closeTab,
        closeOthers,
        duplicateTab,
        renameTab,
        togglePin,
        restoreTab,
        setDirty,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}

/**
 * Pages call this to report whether they hold unsaved work (e.g. a Billing cart
 * with items, a Purchase with a medicine added). The current tab is marked
 * dirty, which (a) drives the unsaved-close warning and (b) makes the next
 * module navigation open in a NEW tab instead of reusing this one.
 */
export function useTabDirty(dirty: boolean): void {
  const { activeKey, setDirty } = useWorkspace();
  useEffect(() => {
    if (activeKey) setDirty(activeKey, dirty);
  }, [activeKey, dirty, setDirty]);
}

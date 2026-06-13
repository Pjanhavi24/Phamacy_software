"use client";

import { useEffect, useState } from "react";

/**
 * Store + print settings, edited on the Settings page and consumed by the bill
 * print (Billing) and the sample bill. Persisted in localStorage (no backend
 * settings route yet) and broadcast so open tabs update live.
 */
export interface StoreSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  dlNumber: string;
  phone: string;
  email: string;
  /** Default hard-copy format for printed bills. */
  printFormat: "a4" | "thermal";
}

const KEY = "pharma_store_settings_v1";
const EVENT = "pharma-store-settings-changed";

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  name: "PharmaCare Pharmacy",
  address: "123 Health Street, Andheri West",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400058",
  gstin: "27AABCP1234E1ZX",
  dlNumber: "MH-AND-20B/20C-123456",
  phone: "+91 98765 43210",
  email: "care@pharmacare.in",
  printFormat: "thermal",
};

export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_STORE_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_STORE_SETTINGS;
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota / unavailable — non-fatal */
  }
}

/** Reactive hook: returns the current settings and updates when they change. */
export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  useEffect(() => {
    setSettings(getStoreSettings());
    const onChange = () => setSettings(getStoreSettings());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return settings;
}

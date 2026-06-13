"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * The purchase-entry experience is consolidated into the single /purchase flow
 * (real backend-connected form). This legacy route now forwards there, keeping
 * any ?supplier=<id> preselect intact for old links/bookmarks.
 */
export default function NewPurchaseRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/purchase${search}`);
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center gap-2 p-10 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Redirecting to Purchase Entry…
    </div>
  );
}

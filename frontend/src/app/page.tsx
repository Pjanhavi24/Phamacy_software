"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Simulate auth check â€” replace with real session/cookie check
    const checkAuth = async () => {
      try {
        // Example: const session = await getSession();
        // For now, assume authenticated
        const isAuthenticated = true; // Replace with real auth check

        if (isAuthenticated) {
          router.replace("/billing");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (!checking) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
          <Pill size={26} className="text-white" />
        </div>
        <div>
          <div className="text-gray-900 font-semibold text-xl tracking-tight">PharmaERP</div>
          <div className="text-gray-400 text-[10px] tracking-widest uppercase">Pharmacy Software</div>
        </div>
      </div>

      {/* Spinner */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
      </div>

      <p className="text-gray-500 text-sm">Checking session...</p>
    </div>
  );
}

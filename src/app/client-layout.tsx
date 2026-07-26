"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = pathname === "/login" || pathname === "/register" || pathname.startsWith("/client");

  return (
    <div className="flex min-h-screen">
      {!isStandalone && <Sidebar />}
      <main className={!isStandalone ? "ml-64 flex-1 p-8" : "flex-1"}>
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

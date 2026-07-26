"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/bookings", label: "Bookings", icon: "📅" },
  { href: "/cleaners", label: "Cleaners", icon: "🧹" },
  { href: "/schedule", label: "Schedule", icon: "📋" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) setUser(data);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🏠</span> CoHost
        </h1>
        <p className="text-xs text-gray-500 mt-1">Airbnb Management Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-3">
        {user && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 truncate max-w-[140px]">
              {user.name}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        )}
        <div className="text-xs text-gray-400 text-center">
          CoHost Panel v1.0
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
}

interface Booking {
  id: number;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

export default function ClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const meData = await meRes.json();
        if (meData.role !== "client") {
          router.push("/");
          return;
        }
        setUser(meData);

        const [propRes, bookRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/bookings"),
        ]);
        const props = await propRes.json();
        const books = await bookRes.json();
        setProperties(props.properties || []);
        setBookings(books.bookings || []);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />

      {/* Client Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            🏡 My Properties
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Properties */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Your Properties
          </h2>
          {properties.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                No properties linked yet. Your cohost will set this up for you.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.address}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bookings */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Upcoming Bookings
          </h2>
          {bookings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                No bookings yet.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Check In</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Check Out</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{b.guest_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.check_in}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.check_out}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

interface DashboardData {
  stats: {
    totalBookings: number;
    upcomingCheckins: number;
    upcomingCheckouts: number;
    pendingCleanings: number;
    activeBookings: number;
  };
  recentBookings: any[];
  upcomingCleanings: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Total Bookings", value: data.stats.totalBookings, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Guests", value: data.stats.activeBookings, color: "text-green-600", bg: "bg-green-50" },
    { label: "Upcoming Check-ins", value: data.stats.upcomingCheckins, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Check-outs (7 days)", value: data.stats.upcomingCheckouts, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Pending Cleanings", value: data.stats.pendingCleanings, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your cohosting business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`card ${stat.bg} border-0`}>
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">📅 Recent & Upcoming Bookings</h2>
          {data.recentBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">No bookings found. Sync your Airbnb iCal or add manually.</p>
          ) : (
            <div className="space-y-3">
              {data.recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{b.guest_name}</p>
                    <p className="text-xs text-gray-500">{b.property_name || `Property #${b.property_id}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {format(parseISO(b.check_in), "MMM d")} → {format(parseISO(b.check_out), "MMM d, yyyy")}
                    </p>
                    <span className={`badge text-xs mt-1 ${
                      new Date(b.check_out) < new Date() ? "badge-green" : "badge-blue"
                    }`}>
                      {new Date(b.check_out) < new Date() ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Cleanings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">🧹 Upcoming Cleanings</h2>
          {data.upcomingCleanings.length === 0 ? (
            <p className="text-gray-400 text-sm">No cleaning tasks scheduled.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingCleanings.map((cs: any) => (
                <div key={cs.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{cs.property_name || "Property"}</p>
                    <p className="text-xs text-gray-500">
                      {cs.cleaner_name ? `Cleaner: ${cs.cleaner_name}` : "Unassigned"} • {cs.guest_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-600">
                      {cs.scheduled_date ? format(parseISO(cs.scheduled_date), "MMM d, yyyy") : "TBD"}
                    </p>
                    <span className="badge badge-orange text-xs mt-1">{cs.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

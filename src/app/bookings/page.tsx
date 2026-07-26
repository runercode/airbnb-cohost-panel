"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    property_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    notes: "",
  });

  const fetchBookings = useCallback(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => toast.error("Failed to load bookings"));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ])
      .then(([b, p]) => {
        setBookings(b.bookings || []);
        setProperties(p.properties || []);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    if (properties.length === 0) {
      toast.error("Add a property with an iCal URL first in Settings");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/ical-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: properties[0].id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced! ${data.imported} new bookings imported.`);
      } else {
        toast.error(data.error || "Sync failed");
      }
      fetchBookings();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.check_in || !form.check_out || !form.property_id) {
      toast.error("Property, check-in and check-out are required");
      return;
    }
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Booking added!");
      setShowForm(false);
      setForm({ property_id: "", guest_name: "", guest_email: "", guest_phone: "", check_in: "", check_out: "", notes: "" });
      fetchBookings();
    } else {
      toast.error("Failed to add booking");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this booking?")) return;
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    toast.success("Booking deleted");
    fetchBookings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage all guest reservations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-secondary">
            {syncing ? "🔄 Syncing..." : "🔄 Sync iCal"}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            + Add Booking
          </button>
        </div>
      </div>

      {/* Add Booking Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">New Booking</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property</label>
              <select
                className="input-field"
                value={form.property_id}
                onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                required
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Name</label>
              <input className="input-field" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Email</label>
              <input className="input-field" type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} placeholder="guest@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guest Phone</label>
              <input className="input-field" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} placeholder="+1-555-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-in</label>
              <input className="input-field" type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-out</label>
              <input className="input-field" type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Booking</button>
            </div>
          </form>
        </div>
      )}

      {/* Bookings List */}
      <div className="card">
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No bookings yet. Sync your Airbnb iCal or add one manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Check-in</th>
                  <th className="pb-3 font-medium">Check-out</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Cleaner</th>
                  <th className="pb-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium">{b.guest_name}</p>
                      {b.guest_email && <p className="text-xs text-gray-400">{b.guest_email}</p>}
                    </td>
                    <td className="py-3 text-gray-600">{b.property_name || `#${b.property_id}`}</td>
                    <td className="py-3">{format(parseISO(b.check_in), "MMM d, yyyy")}</td>
                    <td className="py-3">{format(parseISO(b.check_out), "MMM d, yyyy")}</td>
                    <td className="py-3">
                      <span className={`badge ${
                        b.status === "confirmed" ? "badge-blue" :
                        b.status === "completed" ? "badge-green" : "badge-orange"
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 text-gray-600">{b.cleaner_name || "—"}</td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ booking_id: "", cleaner_id: "", scheduled_date: "", notes: "" });

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch("/api/schedule").then((r) => r.json()),
      fetch("/api/cleaners").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ])
      .then(([s, c, b]) => {
        setSchedules(s);
        setCleaners(c);
        setBookings(b.bookings || []);
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  useEffect(() => {
    fetchAll();
    setLoading(false);
  }, [fetchAll]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.booking_id || !form.scheduled_date) {
      toast.error("Booking and date are required");
      return;
    }
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cleaner_id: form.cleaner_id || null }),
    });
    if (res.ok) {
      toast.success("Scheduled!");
      setShowForm(false);
      setForm({ booking_id: "", cleaner_id: "", scheduled_date: "", notes: "" });
      fetchAll();
    } else {
      toast.error("Failed to schedule");
    }
  };

  const handleAssign = async (scheduleId: number, cleanerId: string) => {
    await fetch(`/api/schedule/${scheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cleaner_id: cleanerId || null }),
    });
    toast.success("Cleaner assigned!");
    fetchAll();
  };

  const handleStatus = async (scheduleId: number, status: string) => {
    await fetch(`/api/schedule/${scheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(`Marked as ${status}`);
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this schedule entry?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    toast.success("Removed");
    fetchAll();
  };

  // Auto-suggest checkout dates for new schedule entries
  const selectedBooking = bookings.find((b) => b.id === Number(form.booking_id));

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
          <h1 className="text-2xl font-bold text-gray-900">Cleaning Schedule</h1>
          <p className="text-gray-500 mt-1">Assign cleaners to checkout dates</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Schedule</button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">New Cleaning Task</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Booking *</label>
              <select
                className="input-field"
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
                required
              >
                <option value="">Select booking...</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.guest_name} — {b.check_in} → {b.check_out} ({b.property_name || "Property"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cleaner</label>
              <select
                className="input-field"
                value={form.cleaner_id}
                onChange={(e) => setForm({ ...form, cleaner_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date *</label>
              <input
                className="input-field"
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                required
              />
              {selectedBooking && (
                <p className="text-xs text-brand-600 mt-1">
                  Tip: Checkout is {selectedBooking.check_out}
                </p>
              )}
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {schedules.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No cleaning tasks scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Cleaner</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((cs) => (
                  <tr key={cs.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium">
                      {cs.scheduled_date ? format(parseISO(cs.scheduled_date), "MMM d, yyyy") : "TBD"}
                    </td>
                    <td className="py-3 text-gray-600">{cs.property_name || "—"}</td>
                    <td className="py-3">{cs.guest_name || "—"}</td>
                    <td className="py-3">
                      <select
                        className="text-sm border rounded px-2 py-1"
                        value={cs.cleaner_id || ""}
                        onChange={(e) => handleAssign(cs.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {cleaners.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <select
                        className={`text-sm border rounded px-2 py-1 ${
                          cs.status === "completed" ? "bg-green-50" :
                          cs.status === "in-progress" ? "bg-orange-50" : ""
                        }`}
                        value={cs.status}
                        onChange={(e) => handleStatus(cs.id, e.target.value)}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(cs.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
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

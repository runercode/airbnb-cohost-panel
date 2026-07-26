"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", rate: "" });

  const fetchCleaners = useCallback(() => {
    fetch("/api/cleaners")
      .then((r) => r.json())
      .then(setCleaners)
      .catch(() => toast.error("Failed to load cleaners"));
  }, []);

  useEffect(() => {
    fetch("/api/cleaners")
      .then((r) => r.json())
      .then(setCleaners)
      .catch(() => toast.error("Failed to load cleaners"))
      .finally(() => setLoading(false));
  }, [fetchCleaners]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }
    const res = await fetch("/api/cleaners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rate: form.rate ? Number(form.rate) : 0 }),
    });
    if (res.ok) {
      toast.success("Cleaner added!");
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", rate: "" });
      fetchCleaners();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this cleaner?")) return;
    await fetch(`/api/cleaners/${id}`, { method: "DELETE" });
    toast.success("Cleaner removed");
    fetchCleaners();
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
          <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
          <p className="text-gray-500 mt-1">Manage your cleaning team</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Cleaner</button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">New Cleaner</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate ($)</label>
              <input className="input-field" type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Cleaner</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {cleaners.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No cleaners added yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cleaners.map((c) => (
              <div key={c.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
                {c.rate > 0 && (
                  <p className="mt-2 text-sm font-medium text-brand-600">${c.rate}/clean</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Property {
  id: number;
  name: string;
  address: string | null;
  ical_url: string | null;
  user_id: number;
}

interface Booking {
  id: number;
  property_id: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  status: string;
  property_name?: string;
}

interface CleaningTask {
  id: number;
  booking_id: number;
  cleaner_id: number | null;
  scheduled_date: string;
  status: string;
  guest_name?: string;
  property_name?: string;
}

export default function ClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedule, setSchedule] = useState<CleaningTask[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [showPropForm, setShowPropForm] = useState(false);
  const [propForm, setPropForm] = useState({ name: "", address: "", ical_url: "" });
  const [addingProp, setAddingProp] = useState(false);

  const [syncing, setSyncing] = useState<Record<number, boolean>>({});

  const [msgBooking, setMsgBooking] = useState<number>(0);
  const [msgChannel, setMsgChannel] = useState<"email" | "sms">("email");
  const [msgContent, setMsgContent] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [fwdEmail, setFwdEmail] = useState("");
  const [fwdPhone, setFwdPhone] = useState("");

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch("/api/properties").then(r => r.json()),
      fetch("/api/bookings").then(r => r.json()),
      fetch("/api/schedule").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
    ])
      .then(([p, b, s, st]) => {
        setProperties(p.properties || []);
        setBookings(b.bookings || []);
        setSchedule(s || []);
        setSettings(st || {});
        setFwdEmail(st?.forward_email || "");
        setFwdPhone(st?.forward_phone || "");
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      if (meData.role !== "client") { router.push("/"); return; }
      setUser(meData);
    }
    init();
  }, [router]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  async function handleAddProperty(e: FormEvent) {
    e.preventDefault();
    if (!propForm.name.trim()) { toast.error("Property name is required"); return; }
    setAddingProp(true);
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(propForm),
    });
    if (res.ok) {
      toast.success("Property added!");
      setPropForm({ name: "", address: "", ical_url: "" });
      setShowPropForm(false);
      fetchAll();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to add property");
    }
    setAddingProp(false);
  }

  async function handleDeleteProperty(id: number) {
    if (!confirm("Delete this property and all its bookings?")) return;
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Property removed"); fetchAll(); }
  }

  async function handleSyncCalendar(propertyId: number) {
    setSyncing(s => ({ ...s, [propertyId]: true }));
    const res = await fetch("/api/ical-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: propertyId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Synced ${data.imported} bookings from Airbnb!`);
      fetchAll();
    } else {
      toast.error(data.error || "Sync failed. Check your iCal URL.");
    }
    setSyncing(s => ({ ...s, [propertyId]: false }));
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!msgBooking || !msgContent.trim()) { toast.error("Select a booking and type a message"); return; }
    setSendingMsg(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: msgBooking,
        direction: "outbound",
        channel: msgChannel,
        content: msgContent,
      }),
    });
    if (res.ok) {
      toast.success("Message sent!");
      setMsgContent("");
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to send");
    }
    setSendingMsg(false);
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forward_email: fwdEmail, forward_phone: fwdPhone }),
    });
    if (res.ok) { toast.success("Settings saved!"); } else { toast.error("Failed to save"); }
    setSavingSettings(false);
  }

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

  const activeBookings = bookings.filter(b => new Date(b.check_out) >= new Date());
  const pastBookings = bookings.filter(b => new Date(b.check_out) < new Date()).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">🏠</span> My CoHost Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ADD PROPERTY */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🏡 My Properties</h2>
            {!showPropForm && (
              <button onClick={() => setShowPropForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + Add Property
              </button>
            )}
          </div>

          {properties.length === 0 && !showPropForm && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No properties yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add your Airbnb property and paste your iCal calendar URL to get started.
              </p>
            </div>
          )}

          {showPropForm && (
            <form onSubmit={handleAddProperty} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name *</label>
                  <input
                    value={propForm.name}
                    onChange={e => setPropForm({ ...propForm, name: e.target.value })}
                    placeholder="Beachfront Villa"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <input
                    value={propForm.address}
                    onChange={e => setPropForm({ ...propForm, address: e.target.value })}
                    placeholder="123 Ocean Drive"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Airbnb iCal URL</label>
                <input
                  value={propForm.ical_url}
                  onChange={e => setPropForm({ ...propForm, ical_url: e.target.value })}
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Get this from Airbnb → Calendar → Availability settings → Export Calendar</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPropForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg">Cancel</button>
                <button type="submit" disabled={addingProp} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {addingProp ? "Adding..." : "Add Property"}
                </button>
              </div>
            </form>
          )}

          {properties.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {properties.map(p => (
                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                      {p.address && <p className="text-sm text-gray-500 dark:text-gray-400">{p.address}</p>}
                      {p.ical_url && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[250px] mt-1">{p.ical_url}</p>}
                    </div>
                    <button onClick={() => handleDeleteProperty(p.id)} className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0">✕</button>
                  </div>
                  <button
                    onClick={() => handleSyncCalendar(p.id)}
                    disabled={syncing[p.id] || !p.ical_url}
                    className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-medium"
                  >
                    {syncing[p.id] ? "🔄 Syncing..." : "📅 Sync Airbnb Calendar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACTIVE BOOKINGS */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📅 Active Bookings</h2>
          {activeBookings.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No upcoming bookings. Add a property and sync your Airbnb calendar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Property</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Check In</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Check Out</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBookings.map(b => (
                    <tr key={b.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{b.guest_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.property_name || `#${b.property_id}`}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.check_in}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.check_out}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SEND MESSAGE */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💬 Message a Guest</h2>
          {activeBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">No bookings to message yet.</p>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guest</label>
                  <select
                    value={msgBooking}
                    onChange={e => setMsgBooking(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={0}>Select a guest...</option>
                    {activeBookings.map(b => (
                      <option key={b.id} value={b.id}>{b.guest_name} ({b.property_name}) — {b.check_in} to {b.check_out}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                  <select
                    value={msgChannel}
                    onChange={e => setMsgChannel(e.target.value as "email" | "sms")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="email">📧 Email</option>
                    <option value="sms">📱 SMS</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={sendingMsg || !msgBooking} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-medium">
                    {sendingMsg ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  placeholder={`Hi,\n\nLooking forward to your stay! Here are check-in details...\n\n— ${user?.name || "Your Host"}`}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </form>
          )}
        </section>

        {/* CLEANING */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🧹 Cleaning Schedule</h2>
          {schedule.filter(s => s.status === "scheduled" || s.status === "pending").length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No scheduled cleanings yet. They auto-populate on checkout dates.</p>
          ) : (
            <div className="space-y-2">
              {schedule.filter(s => s.status === "scheduled" || s.status === "pending").slice(0, 8).map(cs => (
                <div key={cs.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{cs.property_name || "Property"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Guest: {cs.guest_name || "—"} • {cs.scheduled_date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cs.status === "scheduled" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{cs.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FORWARDING */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📧 Forwarding Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Where guest messages and replies get forwarded to.</p>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  value={fwdEmail}
                  onChange={e => setFwdEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (SMS)</label>
                <input
                  value={fwdPhone}
                  onChange={e => setFwdPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <button type="submit" disabled={savingSettings} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {savingSettings ? "Saving..." : "💾 Save"}
            </button>
          </form>
        </section>

        {/* PAST BOOKINGS */}
        {pastBookings.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Recent Past Bookings</h2>
            <div className="space-y-2">
              {pastBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{b.guest_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.property_name || `#${b.property_id}`} • {b.check_in} → {b.check_out}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">done</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
}

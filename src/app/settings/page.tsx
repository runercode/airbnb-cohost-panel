"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [propForm, setPropForm] = useState({ name: "", address: "", ical_url: "" });
  const [showPropForm, setShowPropForm] = useState(false);

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setSettings(s);
        setProperties(p.properties || []);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      toast.success("Settings saved!");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propForm.name) { toast.error("Property name is required"); return; }
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
    }
  };

  const handleDeleteProperty = async (id: number) => {
    if (!confirm("Delete this property?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    toast.success("Property removed");
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure integrations and forwarding</p>
      </div>

      {/* Properties */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">🏠 Properties</h2>
          <button onClick={() => setShowPropForm(!showPropForm)} className="btn-secondary text-sm">+ Add Property</button>
        </div>

        {showPropForm && (
          <form onSubmit={handleAddProperty} className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input className="input-field text-sm" value={propForm.name} onChange={(e) => setPropForm({ ...propForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Address</label>
              <input className="input-field text-sm" value={propForm.address} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Airbnb iCal URL</label>
              <input className="input-field text-sm" value={propForm.ical_url} onChange={(e) => setPropForm({ ...propForm, ical_url: e.target.value })} placeholder="https://www.airbnb.com/calendar/ical/..." />
              <p className="text-xs text-gray-400 mt-1">Get this from Airbnb → Listings → Calendar → Export Calendar</p>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowPropForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm">Add Property</button>
            </div>
          </form>
        )}

        {properties.length === 0 ? (
          <p className="text-gray-400 text-sm">No properties yet.</p>
        ) : (
          <div className="space-y-2">
            {properties.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.address && <p className="text-xs text-gray-500">{p.address}</p>}
                  {p.ical_url && <p className="text-xs text-gray-400 truncate max-w-md">{p.ical_url}</p>}
                </div>
                <button onClick={() => handleDeleteProperty(p.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forwarding Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">📧 Forwarding</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Forward Email To</label>
            <input
              className="input-field"
              value={settings.forward_email || ""}
              onChange={(e) => setSettings({ ...settings, forward_email: e.target.value })}
              placeholder="your-email@gmail.com"
            />
            <p className="text-xs text-gray-400 mt-1">Where guest messages get forwarded</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Forward SMS To</label>
            <input
              className="input-field"
              value={settings.forward_phone || ""}
              onChange={(e) => setSettings({ ...settings, forward_phone: e.target.value })}
              placeholder="+1234567890"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_enabled === "true"}
                onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked ? "true" : "false" })}
                className="rounded"
              />
              <span className="text-sm">Enable Email Forwarding</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_enabled === "true"}
                onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked ? "true" : "false" })}
                className="rounded"
              />
              <span className="text-sm">Enable SMS Forwarding</span>
            </label>
          </div>
        </div>
      </div>

      {/* Auto-Scheduling */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">🧹 Automation</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.auto_schedule_cleaning !== "false"}
            onChange={(e) => setSettings({ ...settings, auto_schedule_cleaning: e.target.checked ? "true" : "false" })}
            className="rounded"
          />
          <span className="text-sm">Auto-create cleaning tasks on checkout dates (when bookings are added)</span>
        </label>
      </div>

      {/* Environment Variables Info */}
      <div className="card bg-gray-50 border-gray-200">
        <h2 className="text-lg font-semibold mb-2">🔐 Environment Variables (.env)</h2>
        <p className="text-sm text-gray-500 mb-3">
          For email &amp; SMS integration to work, create a <code className="bg-gray-200 px-1 rounded">.env</code> file
          based on <code className="bg-gray-200 px-1 rounded">.env.example</code> with your SMTP and Twilio credentials.
        </p>
        <div className="text-xs text-gray-400 space-y-1">
          <p><strong>SMTP_HOST</strong> — SMTP server (e.g., smtp.gmail.com)</p>
          <p><strong>SMTP_USER / SMTP_PASS</strong> — Email credentials (use Gmail App Password)</p>
          <p><strong>TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN</strong> — Twilio credentials</p>
          <p><strong>TWILIO_PHONE_NUMBER</strong> — Your Twilio phone number</p>
          <p><strong>FORWARD_TO_EMAIL / FORWARD_TO_PHONE</strong> — Where to forward messages</p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? "Saving..." : "💾 Save All Settings"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ booking_id: "", channel: "email", content: "" });
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then(setMessages)
      .catch(() => toast.error("Failed to load messages"));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/messages").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ])
      .then(([m, b]) => {
        setMessages(m);
        setBookings(b.bookings || []);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.booking_id || !form.content) {
      toast.error("Select a booking and enter a message");
      return;
    }
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, direction: "outbound" }),
    });
    if (res.ok) {
      toast.success("Message sent & forwarded!");
      setForm({ booking_id: "", channel: "email", content: "" });
      fetchMessages();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to send");
    }
    setSending(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">Send messages to guests — forwarded to your email &amp; phone</p>
      </div>

      {/* Compose */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Compose Message</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                    {b.guest_name} ({b.check_in} → {b.check_out})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Channel</label>
              <select
                className="input-field"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message *</label>
            <textarea
              className="input-field"
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={`Hi [Guest Name],

Check-in instructions for your stay...
Address: [Property Address]
Door code: [Code]

Let us know if you have any questions!`}
              required
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? "Sending..." : "Send & Forward"}
            </button>
          </div>
        </form>
      </div>

      {/* Message History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Message History</h2>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`p-4 rounded-lg ${
                m.direction === "outbound" ? "bg-brand-50 ml-8" : "bg-gray-50 mr-8"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {m.direction === "outbound" ? "📤 Sent" : "📥 Received"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {m.channel === "email" ? "📧" : "📱"} {m.guest_name || `Booking #${m.booking_id}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(m.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

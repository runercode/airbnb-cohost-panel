// JSON-based data store - works locally (file) and on Netlify (Blobs)
import { getStore as getBlobStore } from '@netlify/blobs';

const STORE_KEY = 'cohost-data';
const now = () => new Date().toISOString();

// ---- Types ----
export interface User {
  id: number;
  email: string;
  password_hash?: string;
  name: string;
  role: 'admin' | 'client';
  created_at: string;
}
export interface Session { id: string; user_id: number; expires_at: string; created_at: string; }
export interface Property { id: number; user_id: number; name: string; address: string | null; ical_url: string | null; created_at: string; }
export interface Booking { id: number; property_id: number; guest_name: string; guest_email: string | null; guest_phone: string | null; check_in: string; check_out: string; source: string; ical_uid: string | null; status: string; notes: string | null; created_at: string; property_name?: string; cleaner_name?: string; }
export interface Cleaner { id: number; name: string; email: string | null; phone: string | null; rate: number; created_at: string; }
export interface CleaningSchedule { id: number; booking_id: number; cleaner_id: number | null; scheduled_date: string; status: string; notes: string | null; created_at: string; guest_name?: string; cleaner_name?: string; property_name?: string; }
export interface Message { id: number; booking_id: number; direction: 'inbound' | 'outbound'; channel: 'email' | 'sms'; content: string; created_at: string; guest_name?: string; }

interface Data {
  users: (User & { password_hash: string })[];
  sessions: Session[];
  properties: Property[];
  bookings: Booking[];
  cleaners: Cleaner[];
  cleaningSchedule: CleaningSchedule[];
  messages: Message[];
  settings: Record<string, string>;
}

const EMPTY: Data = {
  users: [], sessions: [], properties: [], bookings: [],
  cleaners: [], cleaningSchedule: [], messages: [], settings: {}
};

// ---- Storage ----
let cache: Data | null = null;
let dirtyFlag = false;

async function load(): Promise<Data> {
  if (cache) return cache;
  try {
    const store = getBlobStore('cohost');
    const raw = await store.get(STORE_KEY);
    if (raw) { const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw); cache = JSON.parse(text); return cache!; }
  } catch {
    try {
      const fs = require('fs'); const path = require('path');
      const f = path.join(process.cwd(), 'cohost-data.json');
      if (fs.existsSync(f)) {
        cache = JSON.parse(fs.readFileSync(f, 'utf-8'));
        return cache!;
      }
    } catch (_) {}
  }
  cache = JSON.parse(JSON.stringify(EMPTY));
  await seed();
  return cache!;
}

async function persist() {
  if (!dirtyFlag) return;
  const json = JSON.stringify(cache);
  try {
    const store = getBlobStore('cohost');
    await store.set(STORE_KEY, json);
  } catch {
    try {
      const fs = require('fs'); const path = require('path');
      fs.writeFileSync(path.join(process.cwd(), 'cohost-data.json'), json, 'utf-8');
    } catch (_) {}
  }
  dirtyFlag = false;
}

function markDirty() { dirtyFlag = true; }

async function seed() {
  const d = cache!;
  if (Object.keys(d.settings).length === 0) {
    d.settings = { forward_email: '', forward_phone: '', auto_schedule_cleaning: 'true', sms_enabled: 'false', email_enabled: 'false' };
  }
  if (d.users.length === 0) {
    const bcrypt = require('bcryptjs');
    d.users.push({ id: 1, email: 'fbowl1980@gmail.com', password_hash: bcrypt.hashSync('1111', 10), name: 'Admin', role: 'admin', created_at: now() });
  }
  markDirty();
  await persist();
}

function nextId(): number {
  if (!cache) throw new Error('Store not loaded');
  const allIds = [
    ...cache.users, ...cache.properties, ...cache.bookings,
    ...cache.cleaners, ...cache.cleaningSchedule, ...cache.messages
  ].map((x: any) => typeof x.id === 'number' ? x.id : 0);
  return Math.max(1, ...allIds) + 1;
}

// ---- Public API ----
let storePromise: Promise<Store> | null = null;

export class Store {
  data!: Data;

  static async init(): Promise<Store> {
    if (!storePromise) {
      storePromise = (async () => {
        const s = new Store();
        s.data = await load();
        return s;
      })();
    }
    return storePromise;
  }

  async flush() { await persist(); }

  // ---- users ----
  async findUserByEmail(email: string) {
    return this.data.users.find(u => u.email === email) || null;
  }
  async findUserById(id: number) {
    return this.data.users.find(u => u.id === id) || null;
  }
  async insertUser(u: Omit<User & { password_hash: string }, 'id' | 'created_at'>) {
    const user = { ...u, id: nextId(), created_at: now() };
    this.data.users.push(user as any);
    markDirty(); await persist();
    return user;
  }
  async allUsers() { return this.data.users.map(({ password_hash, ...u }) => u) as User[]; }

  // ---- sessions ----
  async createSession(userId: number, sessionId: string) {
    const s: Session = { id: sessionId, user_id: userId, expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(), created_at: now() };
    this.data.sessions.push(s);
    markDirty(); await persist();
    return s;
  }
  async getSessionUser(sessionId: string): Promise<User | null> {
    const s = this.data.sessions.find(s => s.id === sessionId && new Date(s.expires_at) > new Date());
    if (!s) return null;
    return this.findUserById(s.user_id);
  }
  async destroySession(sessionId: string) {
    this.data.sessions = this.data.sessions.filter(s => s.id !== sessionId);
    markDirty(); await persist();
  }

  // ---- properties ----
  async allProperties(userId?: number): Promise<Property[]> {
    return userId ? this.data.properties.filter(p => p.user_id === userId) : this.data.properties;
  }
  async findPropertyById(id: number): Promise<Property | null> {
    return this.data.properties.find(p => p.id === id) || null;
  }
  async insertProperty(p: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    const prop: Property = { ...p, id: nextId(), created_at: now() };
    this.data.properties.push(prop);
    markDirty(); await persist();
    return prop;
  }
  async updateProperty(id: number, patch: Partial<Omit<Property, 'id' | 'created_at'>>) {
    const idx = this.data.properties.findIndex(p => p.id === id);
    if (idx >= 0) { this.data.properties[idx] = { ...this.data.properties[idx], ...patch }; markDirty(); await persist(); }
  }
  async deleteProperty(id: number) {
    this.data.properties = this.data.properties.filter(p => p.id !== id);
    markDirty(); await persist();
  }

  // ---- bookings ----
  async allBookings(userId?: number): Promise<Booking[]> {
    let bookings = this.data.bookings;
    if (userId) {
      const userProps = new Set(this.data.properties.filter(p => p.user_id === userId).map(p => p.id));
      bookings = bookings.filter(b => userProps.has(b.property_id));
    }
    return bookings
      .map(b => ({
        ...b,
        property_name: this.data.properties.find(p => p.id === b.property_id)?.name,
        cleaner_name: this.data.cleaners.find(c =>
          this.data.cleaningSchedule.find(cs => cs.booking_id === b.id && cs.cleaner_id === c.id)
        )?.name,
      }))
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }
  async findBookingById(id: number): Promise<Booking | null> {
    return this.data.bookings.find(b => b.id === id) || null;
  }
  async findBookingByIcalUid(uid: string): Promise<Booking | null> {
    return this.data.bookings.find(b => b.ical_uid === uid) || null;
  }
  async insertBooking(b: Omit<Booking, 'id' | 'created_at' | 'property_name' | 'cleaner_name'>): Promise<Booking> {
    const booking: Booking = { ...b, id: nextId(), created_at: now() };
    this.data.bookings.push(booking);
    markDirty(); await persist();
    return booking;
  }
  async updateBooking(id: number, patch: Partial<Omit<Booking, 'id' | 'created_at' | 'property_name' | 'cleaner_name'>>) {
    const idx = this.data.bookings.findIndex(b => b.id === id);
    if (idx >= 0) { this.data.bookings[idx] = { ...this.data.bookings[idx], ...patch }; markDirty(); await persist(); }
  }
  async deleteBooking(id: number) {
    this.data.bookings = this.data.bookings.filter(b => b.id !== id);
    markDirty(); await persist();
  }

  // ---- cleaners ----
  async allCleaners(): Promise<Cleaner[]> {
    return [...this.data.cleaners].sort((a, b) => a.name.localeCompare(b.name));
  }
  async insertCleaner(c: Omit<Cleaner, 'id' | 'created_at'>): Promise<Cleaner> {
    const cleaner: Cleaner = { ...c, id: nextId(), created_at: now() };
    this.data.cleaners.push(cleaner);
    markDirty(); await persist();
    return cleaner;
  }
  async updateCleaner(id: number, patch: Partial<Omit<Cleaner, 'id' | 'created_at'>>) {
    const idx = this.data.cleaners.findIndex(c => c.id === id);
    if (idx >= 0) { this.data.cleaners[idx] = { ...this.data.cleaners[idx], ...patch }; markDirty(); await persist(); }
  }
  async deleteCleaner(id: number) {
    this.data.cleaners = this.data.cleaners.filter(c => c.id !== id);
    markDirty(); await persist();
  }

  // ---- cleaning schedule ----
  async allSchedule(userId?: number): Promise<CleaningSchedule[]> {
    let schedule = this.data.cleaningSchedule;
    if (userId) {
      const userProps = new Set(this.data.properties.filter(p => p.user_id === userId).map(p => p.id));
      const userBookings = new Set(this.data.bookings.filter(b => userProps.has(b.property_id)).map(b => b.id));
      schedule = schedule.filter(cs => userBookings.has(cs.booking_id));
    }
    return schedule
      .map(cs => ({
        ...cs,
        guest_name: this.data.bookings.find(b => b.id === cs.booking_id)?.guest_name,
        cleaner_name: cs.cleaner_id ? this.data.cleaners.find(c => c.id === cs.cleaner_id)?.name : undefined,
        property_name: this.data.properties.find(p => p.id === (this.data.bookings.find(b => b.id === cs.booking_id)?.property_id ?? 0))?.name,
      }))
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }
  async insertScheduleEntry(cs: Omit<CleaningSchedule, 'id' | 'created_at' | 'guest_name' | 'cleaner_name' | 'property_name'>): Promise<CleaningSchedule> {
    const entry: CleaningSchedule = { ...cs, id: nextId(), created_at: now() };
    this.data.cleaningSchedule.push(entry);
    markDirty(); await persist();
    return entry;
  }
  async updateScheduleEntry(id: number, patch: Partial<Omit<CleaningSchedule, 'id' | 'created_at' | 'guest_name' | 'cleaner_name' | 'property_name'>>) {
    const idx = this.data.cleaningSchedule.findIndex(cs => cs.id === id);
    if (idx >= 0) { this.data.cleaningSchedule[idx] = { ...this.data.cleaningSchedule[idx], ...patch }; markDirty(); await persist(); }
  }
  async deleteScheduleEntry(id: number) {
    this.data.cleaningSchedule = this.data.cleaningSchedule.filter(cs => cs.id !== id);
    markDirty(); await persist();
  }

  // ---- messages ----
  async allMessages(userId?: number): Promise<Message[]> {
    let msgs = this.data.messages;
    if (userId) {
      const userProps = new Set(this.data.properties.filter(p => p.user_id === userId).map(p => p.id));
      const userBookings = new Set(this.data.bookings.filter(b => userProps.has(b.property_id)).map(b => b.id));
      msgs = msgs.filter(m => userBookings.has(m.booking_id));
    }
    return msgs
      .map(m => ({ ...m, guest_name: this.data.bookings.find(b => b.id === m.booking_id)?.guest_name }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);
  }
  async insertMessage(m: Omit<Message, 'id' | 'created_at' | 'guest_name'>): Promise<Message> {
    const msg: Message = { ...m, id: nextId(), created_at: now() };
    this.data.messages.push(msg);
    markDirty(); await persist();
    return msg;
  }

  // ---- settings ----
  async allSettings(): Promise<Record<string, string>> {
    return { ...this.data.settings };
  }
  async getSetting(key: string): Promise<string | undefined> {
    return this.data.settings[key];
  }
  async setSettings(settings: Record<string, string>) {
    Object.assign(this.data.settings, settings);
    markDirty(); await persist();
  }

  // ---- dashboard stats ----
  async getDashboardStats(userId?: number) {
    const bookings = await this.allBookings(userId);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    return {
      totalBookings: bookings.length,
      upcomingCheckins: bookings.filter(b => b.check_in >= today).length,
      upcomingCheckouts: bookings.filter(b => b.check_out >= today).length,
      pendingCleanings: this.data.cleaningSchedule.filter(cs => cs.status === 'scheduled').length,
      todayCheckins: bookings.filter(b => b.check_in === today).length,
      todayCheckouts: bookings.filter(b => b.check_out === today).length,
      tomorrowCheckins: bookings.filter(b => b.check_in === tomorrow).length,
      tomorrowCheckouts: bookings.filter(b => b.check_out === tomorrow).length,
      recentBookings: bookings.slice(0, 5),
      upcomingSchedule: (await this.allSchedule(userId)).slice(0, 5),
    };
  }
}

export async function getStore(): Promise<Store> {
  return Store.init();
}

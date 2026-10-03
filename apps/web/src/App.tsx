import { BrowserMultiFormatReader } from '@zxing/browser';
import axios from 'axios';
import LiveQRCode from './components/ticket/LiveQRCode';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleX,
  Clock3,
  LogOut,
  MapPin,
  QrCode,
  ShieldCheck,
  Ticket,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import api from './lib/api';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex min-h-[40vh] items-center justify-center text-slate-600">Loading...</div>;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [checked, setChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    api
      .get('/organizer/me')
      .then(() => setIsAuthed(true))
      .catch(() => setIsAuthed(false))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return <LoadingSpinner />;
  if (!isAuthed) return <Navigate to="/organizer/login" replace />;
  return children;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3 text-lg font-bold text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Ticket size={20} />
            </div>
            Campus Tickets
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link to="/events">Events</Link>
            <Link to="/organizer/login">Organizer</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
              Campus live
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              Event access made easier.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Book tickets, receive a signed QR confirmation, and let organizers check attendees in instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/events" className="btn-primary">
                Explore events
              </Link>
              <Link to="/organizer/login" className="btn-secondary">
                Organizer login
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <StatCard label="Events" value="12+" />
              <StatCard label="Check-ins" value="96%" />
              <StatCard label="Students" value="1.8k" />
            </div>
          </div>

          <div className="card p-6">
            <div className="rounded-2xl bg-slate-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-sky-200">Featured</span>
                <ShieldCheck />
              </div>
              <h2 className="mt-4 text-3xl font-bold">Innovation Forum</h2>
              <p className="mt-3 text-slate-300">Thursday • 6:00 PM • South Hall</p>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-3"><CalendarDays size={16} /> 2-day startup expo</div>
                <div className="flex items-center gap-3"><MapPin size={16} /> South Hall, Riverside Campus</div>
                <div className="flex items-center gap-3"><Users size={16} /> 240 attendees</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/events')
      .then((response) => setEvents(response.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Discover</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Upcoming campus events</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <div className="card overflow-hidden" key={event.id}>
            <div className="h-40 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">{event.name}</h2>
                {event.registeredCount >= event.capacity ? (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-red-700">
                    REGISTRATION FULL
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Seats available
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{event.description}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><CalendarDays size={16} />{formatDate(event.startTime)}</div>
                <div className="flex items-center gap-2"><Clock3 size={16} />{formatTimeRange(event.startTime, event.endTime)}</div>
                <div className="flex items-center gap-2"><MapPin size={16} />{event.venue}</div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>{event.registeredCount}/{event.capacity} registered</span>
                <span>{Math.max(event.capacity - event.registeredCount, 0)} left</span>
              </div>

              <div className="mt-6 flex gap-3">
                <Link to={`/events/${event.id}`} className="btn-secondary flex-1">
                  View Details
                </Link>
                {event.registeredCount < event.capacity ? (
                  <Link to={`/register/${event.id}`} className="btn-primary flex-1">
                    Register
                  </Link>
                ) : (
                  <button className="btn-secondary flex-1 opacity-60" disabled>
                    Full
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventDetailsPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/events/${eventId}`)
      .then((response) => setEvent(response.data.data))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <LoadingSpinner />;
  if (!event) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Event not found.</div>;

  const seatsRemaining = Math.max(event.capacity - event.registeredCount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-64 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" />
        <div className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Event details</p>
              <h1 className="mt-2 text-4xl font-black text-slate-900">{event.name}</h1>
            </div>
            {event.registeredCount >= event.capacity ? (
              <span className="rounded-full bg-red-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700">
                REGISTRATION FULL
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                OPEN
              </span>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
            <div>
              <p className="text-slate-700">{event.description}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="panel"><CalendarDays size={18} className="mb-2 text-sky-600" /> <p className="text-sm text-slate-500">Date</p><p className="font-semibold">{formatDate(event.startTime)}</p></div>
                <div className="panel"><Clock3 size={18} className="mb-2 text-sky-600" /> <p className="text-sm text-slate-500">Time</p><p className="font-semibold">{formatTimeRange(event.startTime, event.endTime)}</p></div>
                <div className="panel"><MapPin size={18} className="mb-2 text-sky-600" /> <p className="text-sm text-slate-500">Venue</p><p className="font-semibold">{event.venue}</p></div>
                <div className="panel"><Users size={18} className="mb-2 text-sky-600" /> <p className="text-sm text-slate-500">Capacity</p><p className="font-semibold">{event.capacity} max</p></div>
              </div>
            </div>

            <div className="panel">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Registration</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between"><span>Seats remaining</span><span className="font-bold">{seatsRemaining}</span></div>
                <div className="flex items-center justify-between"><span>Registered</span><span className="font-bold">{event.registeredCount}</span></div>
                <div className="flex items-center justify-between"><span>Organizer</span><span className="font-bold">{event.organizer?.name || 'Campus Team'}</span></div>
              </div>

              {event.registeredCount < event.capacity ? (
                <Link to={`/register/${event.id}`} className="btn-primary mt-6 w-full justify-center">
                  Register now <ArrowRight className="ml-2" size={16} />
                </Link>
              ) : (
                <button className="btn-secondary mt-6 w-full opacity-60" disabled>
                  Registration full
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [form, setForm] = useState({ fullName: '', email: '', studentId: '', phone: '', eventId: eventId || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/events/${eventId}/register`, { ...form, eventId });
      const ticketId = response.data.ticket?.id ?? response.data.registration?.id;
      navigate(`/ticket/${ticketId}`);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Registration failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="panel">
        <h1 className="text-3xl font-black text-slate-900">Register for event</h1>
        <p className="mt-2 text-sm text-slate-600">Complete your details to receive your signed ticket.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div>
            <label className="label">Student ID</label>
            <input className="input" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          </div>

          <div>
            <label className="label">Phone Number (optional)</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button disabled={loading} className="btn-primary w-full justify-center" type="submit">
            {loading ? 'Processing...' : 'Complete registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TicketPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    api
      .get(`/tickets/${ticketId}`)
      .then((response) => setTicket(response.data.data))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <LoadingSpinner />;
  if (!ticket) return <div className="mx-auto max-w-2xl px-4 py-16 text-center">Ticket not found.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Ticket</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{ticket.event.name}</h1>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {ticket.ticket.status}
          </span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-4 text-sm text-slate-700">
            <p><strong>Name:</strong> {ticket.participant.name}</p>
            <p><strong>Student ID:</strong> {ticket.participant.studentId}</p>
            <p><strong>Email:</strong> {ticket.participant.email}</p>
            <p><strong>Ticket ID:</strong> {ticket.ticket.id}</p>
            <p><strong>Expires:</strong> {formatDate(ticket.ticket.expiresAt)}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            {ticket.token ? (
              <div className="flex justify-center">
                <LiveQRCode value={ticket.token} size={240} level="H" includeMargin className="mx-auto" />
              </div>
            ) : (
              <>
                <QrCode className="mx-auto mb-3 text-sky-600" size={42} />
                <p className="text-sm text-slate-600">Present this QR code at event access.</p>
              </>
            )}
            <p className="mt-4 text-sm text-slate-600">Present this QR code at event access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizerLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/organizer/login', { email, password });
      navigate('/organizer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="panel">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Access</p>
            <h1 className="text-2xl font-black text-slate-900">Organizer login</h1>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button className="btn-primary w-full justify-center" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrganizerDashboardPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/organizer/events')
      .then((response) => setEvents(response.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await api.post('/organizer/logout');
    navigate('/organizer/login');
  };

  if (loading) return <LoadingSpinner />;

  const totalRegistrations = events.reduce((sum, event) => sum + Number(event.registeredCount || 0), 0);
  const totalCheckedIn = events.reduce((sum, event) => sum + Number(event.checkedIn || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Overview</p>
          <h1 className="text-3xl font-black text-slate-900">Organizer dashboard</h1>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          <LogOut className="mr-2" size={16} /> Logout
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Total events" value={events.length} />
        <StatCard label="Upcoming events" value={events.filter((event) => new Date(event.startTime) > new Date()).length} />
        <StatCard label="Registrations" value={totalRegistrations} />
        <StatCard label="Checked in" value={totalCheckedIn} />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Event</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Capacity</th>
              <th className="px-5 py-4">Registrations</th>
              <th className="px-5 py-4">Checked In</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-slate-200 align-top">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900">{event.name}</div>
                  <div className="text-xs text-slate-500">{event.venue}</div>
                </td>
                <td className="px-5 py-4">{formatDate(event.startTime)}</td>
                <td className="px-5 py-4">{event.capacity}</td>
                <td className="px-5 py-4">{event.registeredCount}</td>
                <td className="px-5 py-4">{event.checkedIn || 0}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/organizer/events/${event.id}`} className="btn-secondary">Manage</Link>
                    <Link to={`/organizer/events/${event.id}/attendees`} className="btn-secondary">Attendees</Link>
                    <Link to={`/organizer/events/${event.id}/scanner`} className="btn-primary">Scanner</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrganizerEventPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/organizer/events'),
      api.get(`/organizer/events/${eventId}/statistics`)
    ])
      .then(([eventsResponse, statsResponse]) => {
        const target = (eventsResponse.data.data || []).find((item: any) => item.id === eventId);
        setEvent(target);
        setStats(statsResponse.data.data);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <LoadingSpinner />;
  if (!event || !stats) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Event not found.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Management</p>
          <h1 className="text-3xl font-black text-slate-900">{event.name}</h1>
        </div>
        <div className="flex gap-3">
          <Link to={`/organizer/events/${eventId}/attendees`} className="btn-secondary">View attendees</Link>
          <Link to={`/organizer/events/${eventId}/scanner`} className="btn-primary">Open scanner</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Registered" value={stats.totalRegistered} />
        <StatCard label="Checked In" value={stats.checkedIn} />
        <StatCard label="Remaining" value={stats.remaining} />
        <StatCard label="Rate" value={`${stats.checkInPercentage}%`} />
      </div>

      <div className="mt-8 panel">
        <h2 className="text-xl font-bold text-slate-900">Event details</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-slate-600"><strong className="text-slate-900">Venue:</strong> {event.venue}</p>
          <p className="text-sm text-slate-600"><strong className="text-slate-900">Capacity:</strong> {event.capacity}</p>
          <p className="text-sm text-slate-600"><strong className="text-slate-900">Date:</strong> {formatDate(event.startTime)}</p>
          <p className="text-sm text-slate-600"><strong className="text-slate-900">Time:</strong> {formatTimeRange(event.startTime, event.endTime)}</p>
        </div>
      </div>
    </div>
  );
}

function OrganizerAttendeesPage() {
  const { eventId } = useParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/organizer/events/${eventId}/attendees`)
      .then((response) => setRows(response.data.data || []))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Attendees</p>
          <h1 className="text-3xl font-black text-slate-900">Event attendee list</h1>
        </div>
        <Link to={`/organizer/events/${eventId}/scanner`} className="btn-primary">Open scanner</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Student ID</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Registration</th>
              <th className="px-5 py-4">Ticket Status</th>
              <th className="px-5 py-4">Check-In Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-5 py-4 font-medium text-slate-900">{row.name}</td>
                <td className="px-5 py-4">{row.studentId}</td>
                <td className="px-5 py-4">{row.email}</td>
                <td className="px-5 py-4">{formatDate(row.registrationTime)}</td>
                <td className="px-5 py-4">{row.ticketStatus}</td>
                <td className="px-5 py-4">{row.checkInTime ? formatDate(row.checkInTime) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScannerPage() {
  const { eventId } = useParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState('READY TO SCAN');
  const [result, setResult] = useState<{ type: 'success' | 'warning' | 'error'; title: string; message: string; checkedInAt?: string } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);

  const showResult = (payload: any) => {
    setResult({
      type: payload.success ? 'success' : payload.status === 'ALREADY_USED' ? 'warning' : 'error',
      title: payload.success ? 'CHECK-IN SUCCESSFUL' : payload.status === 'ALREADY_USED' ? 'ALREADY USED' : payload.status === 'EXPIRED' ? 'EXPIRED TICKET' : payload.status === 'WRONG_EVENT' ? 'WRONG EVENT' : 'INVALID TICKET',
      message: payload.message || 'The ticket could not be verified.',
      checkedInAt: payload.checkedInAt
    });
    setStatus(payload.success ? 'READY TO SCAN' : payload.status || 'READY TO SCAN');
  };

  const submitToken = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setStatus('VERIFYING...');

    try {
      const response = await api.post('/checkin/verify', { token, eventId });
      const payload = response.data;
      showResult(payload);
      setTimeout(() => {
        setResult(null);
        setStatus('READY TO SCAN');
      }, 2500);
    } catch (err: any) {
      const payload = err.response?.data || { success: false, status: 'INVALID_TICKET', message: 'Invalid ticket' };
      showResult(payload);
      setTimeout(() => {
        setResult(null);
        setStatus('READY TO SCAN');
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = async () => {
    try {
      const reader = readerRef.current as { reset?: () => void } | null;
      reader?.reset?.();
    } catch {
      // no-op
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('CAMERA UNAVAILABLE');
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const videoDeviceId = devices[0]?.deviceId || undefined;
      await reader.decodeFromVideoDevice(videoDeviceId, videoRef.current!, (result, error) => {
        if (result) {
          void submitToken(result.getText());
          stopCamera();
        }
        if (error && (error as { name?: string }).name !== 'NotFoundException') {
          setStatus('CAMERA ERROR');
        }
      });
      setStatus('READY TO SCAN');
    } catch (error) {
      setStatus('CAMERA PERMISSION DENIED');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Event check-in</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Event scanner</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <div className="mb-5 flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">Camera view</div>
            <button className="btn-secondary" onClick={startCamera}>Start Camera</button>
          </div>

          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={startCamera}>Start Camera</button>
            <button className="btn-secondary" onClick={stopCamera}>Stop Camera</button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{status}</p>
          </div>

          <div className="mt-6 pt-4">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Can't scan?</p>
            <div className="mt-3 flex gap-3">
              <input value={manualToken} onChange={(e) => setManualToken(e.target.value)} className="input flex-1" placeholder="Enter ticket token" />
              <button className="btn-primary" onClick={() => void submitToken(manualToken)} disabled={loading || !manualToken}>
                Verify
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Verification result</h2>
            {result?.type === 'success' ? <CheckCircle2 className="text-emerald-600" /> : result?.type === 'warning' ? <AlertTriangle className="text-amber-600" /> : result ? <CircleX className="text-red-600" /> : <QrCode className="text-slate-400" />}
          </div>

          {result ? (
            <div className={`rounded-2xl border p-4 ${result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : result.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">{result.title}</p>
              <p className="mt-3 text-lg font-semibold">{result.message}</p>
              {result.checkedInAt && <p className="mt-2 text-sm">Checked in: {new Date(result.checkedInAt).toLocaleString()}</p>}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
              Waiting for a scan.
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <StatCard label="Registered" value="0" />
            <StatCard label="Checked in" value="0" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:eventId" element={<EventDetailsPage />} />
      <Route path="/register/:eventId" element={<RegisterPage />} />
      <Route path="/ticket/:ticketId" element={<TicketPage />} />
      <Route path="/organizer/login" element={<OrganizerLoginPage />} />
      <Route
        path="/organizer/dashboard"
        element={
          <ProtectedRoute>
            <OrganizerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events/:eventId"
        element={
          <ProtectedRoute>
            <OrganizerEventPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events/:eventId/attendees"
        element={
          <ProtectedRoute>
            <OrganizerAttendeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events/:eventId/scanner"
        element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

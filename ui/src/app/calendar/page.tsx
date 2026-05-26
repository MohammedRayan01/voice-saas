'use client';

import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Phone,
    User,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface Appointment {
    id: number;
    appointment_uuid: string;
    organization_id: number;
    workflow_run_id: number | null;
    google_event_id: string | null;
    summary: string;
    caller_name: string | null;
    caller_number: string | null;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    created_at: string | null;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
    return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CalendarPage() {
    const { user, getAccessToken, loading: authLoading } = useAuth();
    const hasFetched = useRef(false);

    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
    const [cancelling, setCancelling] = useState<number | null>(null);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const fetchAppointments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await getAccessToken();
            const from = new Date(year, month, 1).toISOString();
            const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
            const res = await fetch(
                `${API_BASE}/api/v1/appointments?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}&limit=200`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error(`Failed to fetch appointments: ${res.status}`);
            setAppointments(await res.json());
            setError(null);
        } catch (e: any) {
            logger.error(`Calendar fetch error: ${e}`);
            setError('Failed to load appointments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading || !user) return;
        fetchAppointments();
    }, [authLoading, user, year, month]);

    const handleCancel = async (id: number) => {
        if (!user) return;
        setCancelling(id);
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/appointments/${id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Cancel failed');
            setAppointments(prev =>
                prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a)
            );
        } catch (e) {
            logger.error(`Failed to cancel appointment ${id}: ${e}`);
        } finally {
            setCancelling(null);
        }
    };

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const appointmentsByDay: Record<number, Appointment[]> = {};
    appointments.forEach(a => {
        const d = new Date(a.start_time).getDate();
        if (!appointmentsByDay[d]) appointmentsByDay[d] = [];
        appointmentsByDay[d].push(a);
    });

    const selectedAppts = selectedDay ? (appointmentsByDay[selectedDay] ?? []) : [];

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Appointments booked by your voice agents via Google Calendar
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {MONTH_NAMES[month]} {year}
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" onClick={prevMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={nextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center text-muted-foreground py-12">Loading...</div>
                        ) : (
                            <div className="select-none">
                                <div className="grid grid-cols-7 mb-2">
                                    {DAY_NAMES.map(d => (
                                        <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDay }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const dayAppts = appointmentsByDay[day] ?? [];
                                        const isToday =
                                            today.getDate() === day &&
                                            today.getMonth() === month &&
                                            today.getFullYear() === year;
                                        const isSelected = selectedDay === day;
                                        const hasActive = dayAppts.some(a => a.status === 'scheduled');
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDay(day)}
                                                className={[
                                                    'relative flex flex-col items-center rounded-lg p-1 text-sm transition-colors',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground'
                                                        : isToday
                                                            ? 'bg-primary/10 text-primary font-semibold'
                                                            : 'hover:bg-muted',
                                                ].join(' ')}
                                            >
                                                <span>{day}</span>
                                                {hasActive && (
                                                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Day Detail Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {selectedDay
                                ? formatDateLabel(new Date(year, month, selectedDay).toISOString())
                                : 'Select a day'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedAppts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No appointments this day.</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedAppts.map(appt => (
                                    <div
                                        key={appt.id}
                                        className={`rounded-lg border p-3 space-y-2 ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-medium text-sm leading-tight">{appt.summary}</p>
                                            <Badge
                                                variant={appt.status === 'scheduled' ? 'default' : 'secondary'}
                                                className="shrink-0 text-xs"
                                            >
                                                {appt.status === 'scheduled' ? (
                                                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Scheduled</>
                                                ) : (
                                                    <><X className="mr-1 h-3 w-3" /> Cancelled</>
                                                )}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                                            </div>
                                            {appt.caller_name && (
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {appt.caller_name}
                                                </div>
                                            )}
                                            {appt.caller_number && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {appt.caller_number}
                                                </div>
                                            )}
                                        </div>
                                        {appt.status === 'scheduled' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-destructive hover:text-destructive text-xs h-7"
                                                onClick={() => handleCancel(appt.id)}
                                                disabled={cancelling === appt.id}
                                            >
                                                {cancelling === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

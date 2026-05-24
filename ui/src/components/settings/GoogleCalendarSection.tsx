'use client';

import { Calendar, CheckCircle2, Loader2, Unlink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface CalendarStatus {
    connected: boolean;
    calendar_id?: string;
}

export function GoogleCalendarSection() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);
    const [status, setStatus] = useState<CalendarStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetchStatus = async () => {
        if (!user) return;
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/integrations/google-calendar/status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setStatus(await res.json());
            }
        } catch (e) {
            logger.error(`Failed to fetch Google Calendar status: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchStatus();
    }, [user]);

    const handleConnect = async () => {
        if (!user) return;
        const token = await getAccessToken();
        window.location.href = `${API_BASE}/api/v1/integrations/google-calendar/connect?token=${token}`;
    };

    const handleDisconnect = async () => {
        if (!user) return;
        setDisconnecting(true);
        try {
            const token = await getAccessToken();
            await fetch(`${API_BASE}/api/v1/integrations/google-calendar/disconnect`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setStatus({ connected: false });
        } catch (e) {
            logger.error(`Failed to disconnect Google Calendar: ${e}`);
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Google Calendar
                                {status?.connected && (
                                    <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Connected
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Let your voice agents check availability, book, and cancel appointments.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : status?.connected ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
                                <p className="text-muted-foreground">Calendar ID</p>
                                <p className="font-mono text-xs">{status.calendar_id ?? 'primary'}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your agents can now use <code className="rounded bg-muted px-1 text-xs">check_availability</code>,{' '}
                                <code className="rounded bg-muted px-1 text-xs">book_appointment</code>, and{' '}
                                <code className="rounded bg-muted px-1 text-xs">cancel_appointment</code> tools in any workflow node.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Unlink className="mr-2 h-4 w-4" />
                                )}
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Connect your Google account to enable calendar tools in your voice agents. Each organisation connects its own Google account.
                            </p>
                            <Button onClick={handleConnect} className="gap-2">
                                <Calendar className="h-4 w-4" />
                                Connect Google Calendar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

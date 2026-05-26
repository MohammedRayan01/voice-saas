'use client';

import { Calendar, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, Save, Unlink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface CalendarStatus {
    connected: boolean;
    calendar_id?: string;
    has_oauth_app: boolean;
}

interface OAuthApp {
    client_id: string;
    redirect_uri: string;
    has_secret: boolean;
}

export function GoogleCalendarSection() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [status, setStatus] = useState<CalendarStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    // OAuth app form
    const [showAppForm, setShowAppForm] = useState(false);
    const [appForm, setAppForm] = useState({ client_id: '', client_secret: '', redirect_uri: '' });
    const [saving, setSaving] = useState(false);
    const [savedApp, setSavedApp] = useState<OAuthApp | null>(null);

    const fetchStatus = async () => {
        if (!user) return;
        try {
            const token = await getAccessToken();
            const [statusRes, appRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/integrations/google-calendar/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/api/v1/integrations/google-calendar/oauth-app`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            if (statusRes.ok) setStatus(await statusRes.json());
            if (appRes.ok) {
                const app: OAuthApp = await appRes.json();
                setSavedApp(app);
                setAppForm(f => ({ ...f, client_id: app.client_id, redirect_uri: app.redirect_uri }));
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

    const handleSaveApp = async () => {
        if (!appForm.client_id || !appForm.redirect_uri) return;
        if (!savedApp?.has_secret && !appForm.client_secret) return;
        setSaving(true);
        try {
            const token = await getAccessToken();
            const body: Record<string, string> = {
                client_id: appForm.client_id,
                redirect_uri: appForm.redirect_uri,
                client_secret: appForm.client_secret || '<<keep>>',
            };
            // If we already have a secret and the field is blank, send a sentinel so the server keeps it
            if (savedApp?.has_secret && !appForm.client_secret) {
                body.client_secret = '<<keep>>';
            }
            const res = await fetch(`${API_BASE}/api/v1/integrations/google-calendar/oauth-app`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setSavedApp({ client_id: appForm.client_id, redirect_uri: appForm.redirect_uri, has_secret: true });
                setStatus(s => s ? { ...s, has_oauth_app: true } : s);
                setShowAppForm(false);
            }
        } catch (e) {
            logger.error(`Failed to save OAuth app config: ${e}`);
        } finally {
            setSaving(false);
        }
    };

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
            setStatus(s => s ? { ...s, connected: false, calendar_id: undefined } : s);
        } catch (e) {
            logger.error(`Failed to disconnect Google Calendar: ${e}`);
        } finally {
            setDisconnecting(false);
        }
    };

    const defaultRedirectUri = `${API_BASE}/api/v1/integrations/google-calendar/callback`;

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
                <CardContent className="space-y-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Step 1: OAuth App Credentials */}
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${savedApp?.has_secret ? 'bg-green-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                                            {savedApp?.has_secret ? '✓' : '1'}
                                        </div>
                                        <span className="text-sm font-medium">Google OAuth App Credentials</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => setShowAppForm(v => !v)}
                                    >
                                        {showAppForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        {savedApp ? 'Edit' : 'Enter credentials'}
                                    </Button>
                                </div>

                                {!showAppForm && !savedApp && (
                                    <p className="text-xs text-muted-foreground pl-8">
                                        You need a Google Cloud project with Calendar API enabled.{' '}
                                        <a
                                            href="https://console.cloud.google.com/apis/credentials"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline inline-flex items-center gap-0.5"
                                        >
                                            Open Google Console <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </p>
                                )}

                                {showAppForm && (
                                    <div className="pl-8 space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Client ID</Label>
                                            <Input
                                                className="h-8 text-xs font-mono"
                                                placeholder="123456789-abc.apps.googleusercontent.com"
                                                value={appForm.client_id}
                                                onChange={e => setAppForm(f => ({ ...f, client_id: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Client Secret</Label>
                                            <Input
                                                className="h-8 text-xs font-mono"
                                                type="password"
                                                placeholder={savedApp?.has_secret ? '••••••••  (leave blank to keep current)' : 'GOCSPX-...'}
                                                value={appForm.client_secret}
                                                onChange={e => setAppForm(f => ({ ...f, client_secret: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Redirect URI</Label>
                                            <Input
                                                className="h-8 text-xs font-mono"
                                                placeholder={defaultRedirectUri}
                                                value={appForm.redirect_uri || defaultRedirectUri}
                                                onChange={e => setAppForm(f => ({ ...f, redirect_uri: e.target.value }))}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Add this exact URI to your Google Cloud OAuth app's authorised redirect URIs.
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs gap-1"
                                            onClick={handleSaveApp}
                                            disabled={saving || !appForm.client_id || (!savedApp?.has_secret && !appForm.client_secret)}
                                        >
                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            Save credentials
                                        </Button>
                                    </div>
                                )}

                                {!showAppForm && savedApp && (
                                    <p className="text-xs text-muted-foreground pl-8 font-mono">
                                        {savedApp.client_id}
                                    </p>
                                )}
                            </div>

                            {/* Step 2: Connect account */}
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${status?.connected ? 'bg-green-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                                        {status?.connected ? '✓' : '2'}
                                    </div>
                                    <span className="text-sm font-medium">Connect your Google Account</span>
                                </div>

                                {status?.connected ? (
                                    <div className="pl-8 space-y-3">
                                        <div className="rounded border bg-background px-3 py-2 text-xs space-y-0.5">
                                            <p className="text-muted-foreground">Calendar ID</p>
                                            <p className="font-mono">{status.calendar_id ?? 'primary'}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Agents can now use{' '}
                                            <code className="rounded bg-muted px-1">check_availability</code>,{' '}
                                            <code className="rounded bg-muted px-1">book_appointment</code>, and{' '}
                                            <code className="rounded bg-muted px-1">cancel_appointment</code>{' '}
                                            tools in any workflow node.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                                            onClick={handleDisconnect}
                                            disabled={disconnecting}
                                        >
                                            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                                            Disconnect
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="pl-8 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            Authorise access to your Google Calendar.
                                        </p>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs gap-1"
                                            onClick={handleConnect}
                                            disabled={!status?.has_oauth_app}
                                        >
                                            <Calendar className="h-3 w-3" />
                                            Connect Google Calendar
                                        </Button>
                                        {!status?.has_oauth_app && (
                                            <p className="text-xs text-muted-foreground">
                                                Complete step 1 first.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CheckCircle2,
    Clock,
    Loader2,
    MoreHorizontal,
    Plus,
    Radio,
    Send,
    Trash2,
    XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface Broadcast {
    id: number;
    name: string;
    template_name?: string;
    template_language?: string;
    status: 'draft' | 'sending' | 'sent' | 'failed';
    total_recipients: number;
    sent_count: number;
    failed_count?: number;
    created_at: string;
    updated_at: string | null;
}

const STATUS_CONFIG = {
    draft:   { label: 'Draft',   Icon: Clock,         cls: 'bg-slate-700 text-slate-300' },
    sending: { label: 'Sending', Icon: Loader2,        cls: 'bg-yellow-500/20 text-yellow-400' },
    sent:    { label: 'Sent',    Icon: CheckCircle2,   cls: 'bg-emerald-500/20 text-emerald-400' },
    failed:  { label: 'Failed',  Icon: XCircle,        cls: 'bg-red-500/20 text-red-400' },
} as const;

export default function BroadcastsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', template_name: '', language: 'en_US', phone_numbers: '' });
    const [saving, setSaving] = useState(false);

    const headers = useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    }, [getAccessToken]);

    const fetchBroadcasts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/broadcasts`, { headers: await headers() });
            if (r.ok) setBroadcasts(await r.json());
        } catch (e) { logger.error(`${e}`); }
        setLoading(false);
    }, [user, headers]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchBroadcasts();
    }, [user, fetchBroadcasts]);

    function openDialog() {
        setForm({ name: '', template_name: '', language: 'en_US', phone_numbers: '' });
        setStep(1);
        setDialogOpen(true);
    }

    const phoneCount = form.phone_numbers.split(',').map(p => p.trim()).filter(Boolean).length;

    async function handleSend() {
        if (!form.name.trim() || !form.template_name.trim()) return;
        setSaving(true);
        try {
            const phones = form.phone_numbers.split(',').map(p => p.trim()).filter(Boolean);
            const h = await headers();
            const r = await fetch(`${API}/api/v1/whatsapp/broadcasts`, {
                method: 'POST', headers: h,
                body: JSON.stringify({ name: form.name, template_name: form.template_name, template_language: form.language, phone_numbers: phones }),
            });
            if (r.ok) {
                const created: Broadcast = await r.json();
                await fetch(`${API}/api/v1/whatsapp/broadcasts/${created.id}/send`, { method: 'POST', headers: h });
                setDialogOpen(false);
                hasFetched.current = false;
                fetchBroadcasts();
            }
        } catch (e) { logger.error(`${e}`); }
        setSaving(false);
    }

    async function deleteBroadcast(id: number) {
        if (!confirm('Delete this broadcast?')) return;
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/broadcasts/${id}`, { method: 'DELETE', headers: await headers() });
            if (r.ok) setBroadcasts(p => p.filter(b => b.id !== id));
        } catch (e) { logger.error(`${e}`); }
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-slate-400" />
                    <span className="font-semibold text-slate-100">Broadcasts</span>
                </div>
                <Button onClick={openDialog} className="bg-violet-600 hover:bg-violet-500 gap-2 text-sm">
                    <Plus className="h-4 w-4" /> New Broadcast
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
                    </div>
                ) : broadcasts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
                        <Radio className="h-12 w-12 opacity-20" />
                        <p className="text-sm">No broadcasts yet. Create one to reach your contacts.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl">
                        {broadcasts.map(b => {
                            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.draft;
                            const { Icon } = cfg;
                            const pct = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;
                            return (
                                <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-medium text-slate-100 truncate">{b.name}</span>
                                                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0', cfg.cls)}>
                                                    <Icon className={cn('h-3 w-3', b.status === 'sending' && 'animate-spin')} />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            {b.template_name && (
                                                <p className="text-xs text-slate-500 mb-1">
                                                    Template: <span className="font-mono text-slate-400">{b.template_name}</span>
                                                    {b.template_language && ` · ${b.template_language}`}
                                                </p>
                                            )}

                                            {b.total_recipients > 0 && (
                                                <div className="mt-3">
                                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                        <span>
                                                            {b.sent_count}/{b.total_recipients} sent
                                                            {(b.failed_count ?? 0) > 0 && <span className="text-red-400 ml-1">· {b.failed_count} failed</span>}
                                                        </span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-800">
                                                        <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-xs text-slate-600 mt-2">
                                                {b.status === 'sent' && b.updated_at ? `Sent ${format(new Date(b.updated_at), 'MMM d, yyyy HH:mm')}` : `Created ${format(new Date(b.created_at), 'MMM d, yyyy')}`}
                                            </p>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 shrink-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                <DropdownMenuItem onClick={() => deleteBroadcast(b.id)} className="text-red-400 focus:bg-slate-700 focus:text-red-400 gap-2">
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create dialog — 3 steps */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            New Broadcast
                            <span className="text-xs text-slate-500 font-normal ml-auto">Step {step} of 3</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex gap-1.5 mb-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={cn('h-1 flex-1 rounded-full', s <= step ? 'bg-violet-600' : 'bg-slate-700')} />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Broadcast name</Label>
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. June Promo" className="border-slate-700 bg-slate-800 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Template name</Label>
                                    <Input value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))}
                                        placeholder="hello_world" className="border-slate-700 bg-slate-800 text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-slate-300">Language</Label>
                                    <Input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                                        placeholder="en_US" className="border-slate-700 bg-slate-800 text-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Phone numbers <span className="text-slate-500 font-normal">(with country code, comma-separated)</span></Label>
                                <textarea value={form.phone_numbers} onChange={e => setForm(f => ({ ...f, phone_numbers: e.target.value }))}
                                    rows={5} placeholder="+919876543210, +911234567890"
                                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-violet-500/50 resize-none" />
                                {phoneCount > 0 && <p className="text-xs text-slate-500">{phoneCount} recipient{phoneCount !== 1 ? 's' : ''}</p>}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3 py-2">
                            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
                                <div><span className="text-xs text-slate-500">Name</span><p className="text-slate-100 text-sm">{form.name}</p></div>
                                <div><span className="text-xs text-slate-500">Template</span><p className="text-slate-300 text-sm font-mono">{form.template_name} <span className="font-sans text-slate-500">({form.language})</span></p></div>
                                <div><span className="text-xs text-slate-500">Recipients</span><p className="text-slate-300 text-sm">{phoneCount} phone number{phoneCount !== 1 ? 's' : ''}</p></div>
                            </div>
                            <p className="text-xs text-slate-500">Click "Send Broadcast" to queue delivery via WhatsApp.</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => step > 1 ? setStep(s => s - 1) : setDialogOpen(false)} className="text-slate-400">
                            {step > 1 ? 'Back' : 'Cancel'}
                        </Button>
                        {step < 3 ? (
                            <Button onClick={() => setStep(s => s + 1)}
                                disabled={step === 1 && (!form.name.trim() || !form.template_name.trim())}
                                className="bg-violet-600 hover:bg-violet-500">
                                Next
                            </Button>
                        ) : (
                            <Button onClick={handleSend} disabled={saving || phoneCount === 0} className="bg-violet-600 hover:bg-violet-500 gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Send to {phoneCount}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

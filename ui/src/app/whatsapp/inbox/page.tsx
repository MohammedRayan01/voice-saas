'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Check,
    CheckCheck,
    ChevronDown,
    Clock,
    MessageSquare,
    Phone,
    Search,
    Send,
    WifiOff,
    X,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
    id: number;
    contact_id: number;
    status: 'open' | 'pending' | 'closed';
    last_message_text?: string;
    last_message_at?: string;
    unread_count: number;
    created_at: string;
    contact_name?: string;
    contact_phone?: string;
}

interface Message {
    id: number;
    conversation_id: number;
    sender_type: 'customer' | 'agent' | 'bot';
    content_type: string;
    content_text?: string;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(conv: Conversation): string {
    return conv.contact_name?.trim() || conv.contact_phone || `#${conv.id}`;
}

function initials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function convTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM/yy');
}

function safeDate(iso?: string | null): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}

function dateSeparator(iso: string): string {
    const d = safeDate(iso);
    if (!d) return '';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
}

function groupByDate(msgs: Message[]): { label: string; items: Message[] }[] {
    const groups: { label: string; items: Message[] }[] = [];
    let cur = '';
    for (const m of msgs) {
        const d = safeDate(m.created_at);
        const day = d ? format(d, 'yyyy-MM-dd') : 'unknown';
        if (day !== cur) { cur = day; groups.push({ label: dateSeparator(m.created_at), items: [] }); }
        groups[groups.length - 1].items.push(m);
    }
    return groups;
}

const STATUS_DOT: Record<string, string> = {
    open: 'bg-violet-500',
    pending: 'bg-amber-500',
    closed: 'bg-slate-500',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
    const { user, getAccessToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const deepLinkId = searchParams.get('c') ? Number(searchParams.get('c')) : null;

    const [convs, setConvs] = useState<Conversation[]>([]);
    const [active, setActive] = useState<Conversation | null>(null);
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [configOk, setConfigOk] = useState<boolean | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [mobile, setMobile] = useState<'list' | 'thread'>('list');

    const scrollRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const deepLinked = useRef(false);
    const hasFetched = useRef(false);

    const headers = useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    }, [getAccessToken]);

    const fetchConvs = useCallback(async () => {
        if (!user) return;
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/conversations`, { headers: await headers() });
            if (r.ok) setConvs(await r.json());
        } catch (e) { logger.error(`${e}`); }
    }, [user, headers]);

    const fetchMsgs = useCallback(async (id: number) => {
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/conversations/${id}/messages`, { headers: await headers() });
            if (r.ok) setMsgs(await r.json());
        } catch (e) { logger.error(`${e}`); }
    }, [headers]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchConvs();
        (async () => {
            try {
                const r = await fetch(`${API}/api/v1/whatsapp/config`, { headers: await headers() });
                setConfigOk(r.ok && (await r.json()) !== null);
            } catch { setConfigOk(false); }
        })();
    }, [user, fetchConvs, headers]);

    // deep-link auto-select
    useEffect(() => {
        if (deepLinked.current || !deepLinkId || convs.length === 0) return;
        const match = convs.find(c => c.id === deepLinkId);
        if (match) { deepLinked.current = true; selectConv(match); }
    }, [deepLinkId, convs]); // eslint-disable-line

    // scroll to bottom
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs]);

    function selectConv(conv: Conversation) {
        if (pollRef.current) clearInterval(pollRef.current);
        setActive(conv);
        setMsgs([]);
        setMobile('thread');
        fetchMsgs(conv.id);
        pollRef.current = setInterval(() => fetchMsgs(conv.id), 5000);
        router.replace(`/whatsapp/inbox?c=${conv.id}`);
    }

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    async function sendMsg() {
        if (!active || !text.trim() || sending) return;
        const body = text.trim();
        setText('');
        setSending(true);
        const opt: Message = {
            id: Date.now(), conversation_id: active.id, sender_type: 'agent',
            content_type: 'text', content_text: body, status: 'sending',
            created_at: new Date().toISOString(),
        };
        setMsgs(p => [...p, opt]);
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/conversations/${active.id}/send`, {
                method: 'POST', headers: await headers(), body: JSON.stringify({ text: body }),
            });
            if (r.ok) { const sent = await r.json(); setMsgs(p => p.map(m => m.id === opt.id ? sent : m)); fetchConvs(); }
        } catch (e) { logger.error(`${e}`); }
        setSending(false);
    }

    async function changeStatus(convId: number, status: 'open' | 'closed' | 'pending') {
        try {
            await fetch(`${API}/api/v1/whatsapp/conversations/${convId}`, {
                method: 'PATCH', headers: await headers(), body: JSON.stringify({ status }),
            });
            setConvs(p => p.map(c => c.id === convId ? { ...c, status } : c));
            if (active?.id === convId) setActive(p => p ? { ...p, status } : null);
        } catch (e) { logger.error(`${e}`); }
    }

    const filtered = useMemo(() => {
        let list = convs;
        if (filter !== 'all') list = list.filter(c => c.status === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => displayName(c).toLowerCase().includes(q) || (c.last_message_text?.toLowerCase().includes(q) ?? false));
        }
        return list;
    }, [convs, filter, search]);

    return (
        <div className="flex h-full overflow-hidden bg-slate-950 text-white">
            {/* Config banner */}
            {configOk === false && (
                <div className="absolute inset-x-0 z-10 flex items-center gap-2 bg-amber-600/90 px-4 py-2 text-sm">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    WhatsApp not configured.{' '}
                    <a href="/whatsapp/settings" className="underline font-medium">Go to Settings</a>
                </div>
            )}

            {/* Left panel — conversation list */}
            <div className={cn(
                'flex flex-col border-r border-slate-800 bg-slate-900 w-full lg:w-80 shrink-0',
                mobile === 'thread' ? 'hidden lg:flex' : 'flex',
            )}>
                <div className="space-y-2 border-b border-slate-800 p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search conversations..."
                            className="border-slate-700 bg-slate-800 pl-9 text-sm text-white placeholder-slate-500 focus:border-violet-500/50" />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 justify-between">
                                <span className="capitalize">{filter === 'all' ? 'All conversations' : filter}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 w-48">
                            {(['all', 'open', 'pending', 'closed'] as const).map(v => (
                                <DropdownMenuItem key={v} onClick={() => setFilter(v)} className="text-slate-200 focus:bg-slate-700 capitalize">
                                    {v === 'all' ? 'All conversations' : v}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                            <MessageSquare className="h-8 w-8 opacity-30" />
                            <p className="text-sm">No conversations</p>
                        </div>
                    ) : filtered.map(conv => {
                        const name = displayName(conv);
                        return (
                            <button key={conv.id} onClick={() => selectConv(conv)}
                                className={cn('w-full flex items-start gap-3 px-3 py-3 border-b border-slate-800 transition-colors text-left hover:bg-slate-800/50',
                                    active?.id === conv.id && 'bg-slate-800')}>
                                <div className="relative shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-semibold">
                                        {initials(name)}
                                    </div>
                                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900', STATUS_DOT[conv.status])} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-sm font-medium text-slate-100 truncate">{name}</span>
                                        <span className="text-xs text-slate-500 shrink-0">{convTime(conv.last_message_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-xs text-slate-400 truncate">{conv.last_message_text || 'No messages yet'}</p>
                                        {conv.unread_count > 0 && (
                                            <span className="ml-1 shrink-0 h-4 min-w-4 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Center panel — message thread */}
            <div className={cn('flex flex-col flex-1 min-w-0', mobile === 'list' ? 'hidden lg:flex' : 'flex')}>
                {!active ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                        <MessageSquare className="h-12 w-12 opacity-20" />
                        <p className="text-sm">Select a conversation to start messaging</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 bg-slate-900 shrink-0">
                            <button onClick={() => setMobile('list')} className="lg:hidden p-1 text-slate-400 hover:text-white">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="h-8 w-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-semibold shrink-0">
                                {initials(displayName(active))}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-100 truncate">{displayName(active)}</p>
                                {active.contact_phone && <p className="text-xs text-slate-400">{active.contact_phone}</p>}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 gap-1.5">
                                        <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[active.status])} />
                                        <span className="capitalize">{active.status}</span>
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                    {(['open', 'pending', 'closed'] as const).map(s => (
                                        <DropdownMenuItem key={s} onClick={() => changeStatus(active.id, s)} className="text-slate-200 focus:bg-slate-700 capitalize gap-2">
                                            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />{s}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-slate-950">
                            {msgs.length === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-8">No messages yet</p>
                            ) : groupByDate(msgs).map((group, gi) => (
                                <div key={gi}>
                                    <div className="flex items-center gap-3 my-4">
                                        <div className="flex-1 h-px bg-slate-800" />
                                        <span className="text-xs text-slate-500">{group.label}</span>
                                        <div className="flex-1 h-px bg-slate-800" />
                                    </div>
                                    {group.items.map(msg => {
                                        const out = msg.sender_type !== 'customer';
                                        return (
                                            <div key={msg.id} className={cn('flex mb-2', out ? 'justify-end' : 'justify-start')}>
                                                <div className={cn('max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                                                    out ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm')}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content_text || '—'}</p>
                                                    <div className={cn('flex items-center gap-1 mt-1', out ? 'justify-end' : 'justify-start')}>
                                                        <span className="text-[10px] opacity-60">{safeDate(msg.created_at) ? format(safeDate(msg.created_at)!, 'HH:mm') : ''}</span>
                                                        {out && <span className="opacity-60">
                                                            {msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-blue-300" />
                                                                : msg.status === 'delivered' ? <CheckCheck className="h-3 w-3" />
                                                                    : msg.status === 'sending' ? <Clock className="h-3 w-3" />
                                                                        : <Check className="h-3 w-3" />}
                                                        </span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Composer */}
                        <div className="border-t border-slate-800 p-3 bg-slate-900 shrink-0">
                            {active.status === 'closed' ? (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-1">
                                    <X className="h-4 w-4" />
                                    Conversation closed.{' '}
                                    <button onClick={() => changeStatus(active.id, 'open')} className="text-violet-400 hover:text-violet-300 underline">Reopen</button>
                                </div>
                            ) : (
                                <div className="flex gap-2 items-end">
                                    <textarea value={text} onChange={e => setText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                                        placeholder="Type a message... (Enter to send)"
                                        rows={1}
                                        className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 min-h-[38px] max-h-32 overflow-y-auto"
                                        onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 128)}px`; }}
                                    />
                                    <Button onClick={sendMsg} disabled={!text.trim() || sending} size="icon"
                                        className="bg-violet-600 hover:bg-violet-500 h-[38px] w-[38px] shrink-0">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right panel — contact sidebar (desktop xl+) */}
            {active && (
                <div className="hidden xl:flex flex-col w-64 border-l border-slate-800 bg-slate-900 shrink-0">
                    <div className="flex flex-col items-center gap-2 border-b border-slate-800 p-5">
                        <div className="h-14 w-14 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-lg font-semibold">
                            {initials(displayName(active))}
                        </div>
                        <p className="text-sm font-semibold text-slate-100 text-center">{displayName(active)}</p>
                        <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[active.status])} />
                    </div>
                    <div className="p-4 space-y-3">
                        {active.contact_phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="truncate">{active.contact_phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {safeDate(active.created_at) ? formatDistanceToNow(safeDate(active.created_at)!, { addSuffix: true }) : ''}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

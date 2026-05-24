'use client';

import { CheckCircle2, Clock, MessageSquare, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface Escalation {
    id: number;
    query: string;
    answer?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    add_to_kb: boolean;
    created_at: string;
    resolved_at?: string;
    workflow_run_id?: number;
}

const STATUS_TABS = [
    { id: 'pending', label: 'Open' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'dismissed', label: 'Dismissed' },
];

export default function EscalationsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [escalations, setEscalations] = useState<Escalation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [resolving, setResolving] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [addToKb, setAddToKb] = useState<Record<number, boolean>>({});

    const fetchEscalations = async (status?: string) => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await getAccessToken();
            const params = status ? `?status=${status}` : '';
            const res = await fetch(`${API_BASE}/api/v1/escalations${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setEscalations(await res.json());
        } catch (e) {
            logger.error(`Failed to fetch escalations: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchEscalations(activeTab);
    }, [user]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        fetchEscalations(tab);
    };

    const handleResolve = async (id: number) => {
        const answer = answers[id]?.trim();
        if (!answer) return;
        setResolving(id);
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/escalations/${id}/resolve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer, add_to_kb: addToKb[id] ?? false }),
            });
            if (res.ok) {
                fetchEscalations(activeTab);
                setAnswers((a) => { const n = { ...a }; delete n[id]; return n; });
            }
        } catch (e) {
            logger.error(`Failed to resolve escalation: ${e}`);
        } finally {
            setResolving(null);
        }
    };

    const handleDismiss = async (id: number) => {
        try {
            const token = await getAccessToken();
            await fetch(`${API_BASE}/api/v1/escalations/${id}/dismiss`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchEscalations(activeTab);
        } catch (e) {
            logger.error(`Failed to dismiss escalation: ${e}`);
        }
    };

    const pending = escalations.filter((e) => e.status === 'pending').length;

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Escalations
                    {pending > 0 && (
                        <Badge variant="destructive" className="text-xs">{pending} open</Badge>
                    )}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Questions your agents couldn&apos;t answer. Resolve them here — answers can be added to the knowledge base automatically.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
            ) : escalations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground text-sm">
                            {activeTab === 'pending' ? 'No open escalations — your agents are handling everything.' : 'Nothing here yet.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3 max-w-3xl">
                    {escalations.map((esc) => (
                        <Card key={esc.id}>
                            <CardContent className="pt-4 pb-4 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={esc.status === 'pending' ? 'outline' : esc.status === 'resolved' ? 'secondary' : 'outline'}
                                                className={cn("text-xs", esc.status === 'pending' && "border-amber-500 text-amber-600")}
                                            >
                                                {esc.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                                                {esc.status === 'resolved' && <CheckCircle2 className="mr-1 h-3 w-3 text-green-600" />}
                                                {esc.status}
                                            </Badge>
                                            {esc.workflow_run_id && (
                                                <span className="text-xs text-muted-foreground">Run #{esc.workflow_run_id}</span>
                                            )}
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {new Date(esc.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="font-medium text-sm">{esc.query}</p>
                                        {esc.answer && (
                                            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                                                {esc.answer}
                                                {esc.add_to_kb && (
                                                    <span className="ml-2 text-xs text-green-600">Added to KB</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {esc.status === 'pending' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDismiss(esc.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {esc.status === 'pending' && (
                                    <div className="space-y-2 pt-1">
                                        <Textarea
                                            placeholder="Type your answer..."
                                            rows={2}
                                            value={answers[esc.id] ?? ''}
                                            onChange={(e) => setAnswers((a) => ({ ...a, [esc.id]: e.target.value }))}
                                        />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`kb-${esc.id}`}
                                                    checked={addToKb[esc.id] ?? false}
                                                    onCheckedChange={(v) => setAddToKb((a) => ({ ...a, [esc.id]: !!v }))}
                                                />
                                                <Label htmlFor={`kb-${esc.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                                    Add to knowledge base (agents will use this answer in future calls)
                                                </Label>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleResolve(esc.id)}
                                                disabled={!answers[esc.id]?.trim() || resolving === esc.id}
                                            >
                                                {resolving === esc.id ? 'Saving...' : 'Resolve'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

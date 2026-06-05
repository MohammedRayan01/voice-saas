'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ChevronDown,
    GripVertical,
    Kanban,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage { id: number; name: string; position: number; color: string; }
interface Pipeline { id: number; name: string; stages: Stage[]; created_at: string; }
interface Deal {
    id: number; pipeline_id: number; stage_id: number;
    title: string; value: number; currency: string;
    contact_name?: string; contact_phone?: string;
    stage_name?: string; stage_color?: string;
    notes?: string; expected_close_date?: string;
    status: string; created_at: string;
}
interface Contact { id: number; first_name?: string; last_name?: string; phone?: string; }

const DEFAULT_STAGES = [
    { name: 'New Lead', color: '#6366f1' },
    { name: 'Qualified', color: '#eab308' },
    { name: 'Proposal Sent', color: '#f97316' },
    { name: 'Negotiation', color: '#8b5cf6' },
    { name: 'Won', color: '#22c55e' },
];

// ─── Sortable deal card ────────────────────────────────────────────────────────

function DealCard({ deal, onEdit, onDelete }: { deal: Deal; onEdit: (d: Deal) => void; onDelete: (id: number) => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `deal-${deal.id}`,
        data: { deal },
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

    return (
        <div ref={setNodeRef} style={style}
            className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-sm group">
            <div className="flex items-start gap-2">
                <button {...attributes} {...listeners} className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0">
                    <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{deal.title}</p>
                    {deal.contact_name && <p className="text-xs text-slate-400 mt-0.5 truncate">{deal.contact_name}</p>}
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-slate-300">
                            {deal.currency} {Number(deal.value).toLocaleString()}
                        </span>
                        {deal.expected_close_date && (
                            <span className="text-[10px] text-slate-500">{format(new Date(deal.expected_close_date), 'MMM d')}</span>
                        )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-600 hover:text-slate-200 shrink-0 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem onClick={() => onEdit(deal)} className="text-slate-200 focus:bg-slate-700 gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-red-400 focus:bg-slate-700 focus:text-red-400 gap-2">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// ─── Stage column ─────────────────────────────────────────────────────────────

function StageColumn({ stage, deals, onAddDeal, onEditDeal, onDeleteDeal }: {
    stage: Stage; deals: Deal[];
    onAddDeal: (stageId: number) => void;
    onEditDeal: (d: Deal) => void;
    onDeleteDeal: (id: number) => void;
}) {
    const dealIds = deals.map(d => `deal-${d.id}`);

    return (
        <div className="flex flex-col w-72 shrink-0 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
                <span className="text-sm font-medium text-slate-200 flex-1 truncate">{stage.name}</span>
                <span className="text-xs text-slate-500 font-medium">{deals.length}</span>
            </div>

            {/* Deals */}
            <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
                <div className="flex-1 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <div className="p-2 space-y-2 min-h-[60px]">
                        {deals.map(d => (
                            <DealCard key={d.id} deal={d} onEdit={onEditDeal} onDelete={onDeleteDeal} />
                        ))}
                    </div>
                </div>
            </SortableContext>

            {/* Add deal */}
            <button onClick={() => onAddDeal(stage.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-300 border-t border-slate-800 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add deal
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinesPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState<Deal | null>(null);

    // Pipeline dialog
    const [pipelineDialog, setPipelineDialog] = useState(false);
    const [pipelineName, setPipelineName] = useState('');
    const [pipelineSaving, setPipelineSaving] = useState(false);

    // Deal dialog
    const [dealDialog, setDealDialog] = useState(false);
    const [dealEdit, setDealEdit] = useState<Deal | null>(null);
    const [dealForm, setDealForm] = useState({ title: '', value: '', currency: 'INR', contact_id: '', stage_id: '', notes: '', expected_close_date: '' });
    const [dealSaving, setDealSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const headers = useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    }, [getAccessToken]);

    const fetchPipelines = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/pipelines`, { headers: await headers() });
            if (r.ok) {
                const data: Pipeline[] = await r.json();
                setPipelines(data);
                if (data.length > 0 && !activePipeline) setActivePipeline(data[0]);
            }
        } catch (e) { logger.error(`${e}`); }
        setLoading(false);
    }, [user, headers, activePipeline]);

    const fetchDeals = useCallback(async (pipelineId: number) => {
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/pipelines/${pipelineId}/deals`, { headers: await headers() });
            if (r.ok) setDeals(await r.json());
        } catch (e) { logger.error(`${e}`); }
    }, [headers]);

    const fetchContacts = useCallback(async () => {
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/contacts?page_size=100`, { headers: await headers() });
            if (r.ok) setContacts(await r.json());
        } catch (e) { logger.error(`${e}`); }
    }, [headers]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchPipelines();
        fetchContacts();
    }, [user, fetchPipelines, fetchContacts]);

    useEffect(() => {
        if (activePipeline) fetchDeals(activePipeline.id);
    }, [activePipeline, fetchDeals]);

    // ── Create pipeline ────────────────────────────────────────────────────────

    async function createPipeline() {
        if (!pipelineName.trim()) return;
        setPipelineSaving(true);
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/pipelines`, {
                method: 'POST', headers: await headers(),
                body: JSON.stringify({ name: pipelineName, stages: DEFAULT_STAGES }),
            });
            if (r.ok) {
                const p: Pipeline = await r.json();
                setPipelines(prev => [...prev, p]);
                setActivePipeline(p);
                setPipelineDialog(false);
                setPipelineName('');
            }
        } catch (e) { logger.error(`${e}`); }
        setPipelineSaving(false);
    }

    // ── Deal CRUD ──────────────────────────────────────────────────────────────

    function openAddDeal(stageId: number) {
        setDealEdit(null);
        setDealForm({ title: '', value: '', currency: 'INR', contact_id: '', stage_id: String(stageId), notes: '', expected_close_date: '' });
        setDealDialog(true);
    }

    function openEditDeal(d: Deal) {
        setDealEdit(d);
        setDealForm({
            title: d.title, value: String(d.value), currency: d.currency,
            contact_id: '', stage_id: String(d.stage_id),
            notes: d.notes ?? '', expected_close_date: d.expected_close_date ?? '',
        });
        setDealDialog(true);
    }

    async function saveDeal() {
        if (!activePipeline || !dealForm.title.trim()) return;
        setDealSaving(true);
        try {
            const body = {
                pipeline_id: activePipeline.id,
                stage_id: Number(dealForm.stage_id),
                title: dealForm.title,
                value: Number(dealForm.value) || 0,
                currency: dealForm.currency,
                contact_id: dealForm.contact_id ? Number(dealForm.contact_id) : null,
                notes: dealForm.notes || null,
                expected_close_date: dealForm.expected_close_date || null,
            };
            const url = dealEdit ? `${API}/api/v1/whatsapp/deals/${dealEdit.id}` : `${API}/api/v1/whatsapp/deals`;
            const r = await fetch(url, { method: dealEdit ? 'PUT' : 'POST', headers: await headers(), body: JSON.stringify(body) });
            if (r.ok) { setDealDialog(false); fetchDeals(activePipeline.id); }
        } catch (e) { logger.error(`${e}`); }
        setDealSaving(false);
    }

    async function deleteDeal(id: number) {
        if (!confirm('Delete this deal?')) return;
        try {
            await fetch(`${API}/api/v1/whatsapp/deals/${id}`, { method: 'DELETE', headers: await headers() });
            setDeals(p => p.filter(d => d.id !== id));
        } catch (e) { logger.error(`${e}`); }
    }

    // ── Drag and drop ──────────────────────────────────────────────────────────

    function onDragStart(e: DragStartEvent) {
        const deal = e.active.data.current?.deal as Deal | undefined;
        if (deal) setDragging(deal);
    }

    async function onDragEnd(e: DragEndEvent) {
        setDragging(null);
        const { active, over } = e;
        if (!over || !activePipeline) return;

        const dealId = Number(String(active.id).replace('deal-', ''));
        const deal = deals.find(d => d.id === dealId);
        if (!deal) return;

        // Determine target stage
        let targetStageId = deal.stage_id;
        const overId = String(over.id);

        if (overId.startsWith('deal-')) {
            const overDeal = deals.find(d => `deal-${d.id}` === overId);
            if (overDeal) targetStageId = overDeal.stage_id;
        } else if (overId.startsWith('stage-')) {
            targetStageId = Number(overId.replace('stage-', ''));
        }

        if (targetStageId === deal.stage_id) return;

        // Optimistic update
        setDeals(p => p.map(d => d.id === dealId ? { ...d, stage_id: targetStageId } : d));
        try {
            await fetch(`${API}/api/v1/whatsapp/deals/${dealId}`, {
                method: 'PUT', headers: await headers(), body: JSON.stringify({ stage_id: targetStageId }),
            });
        } catch (e) { logger.error(`${e}`); fetchDeals(activePipeline.id); }
    }

    const stages = activePipeline?.stages.slice().sort((a, b) => a.position - b.position) ?? [];

    if (loading) return (
        <div className="flex items-center justify-center h-full bg-slate-950">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <Kanban className="h-5 w-5 text-slate-400" />
                    {pipelines.length === 0 ? (
                        <span className="text-slate-400 text-sm">No pipelines yet</span>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="text-slate-100 font-semibold gap-1.5 px-2 hover:bg-slate-800">
                                    {activePipeline?.name ?? 'Select pipeline'}
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-slate-700 min-w-48">
                                {pipelines.map(p => (
                                    <DropdownMenuItem key={p.id} onClick={() => setActivePipeline(p)} className="text-slate-200 focus:bg-slate-700">
                                        {p.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <Button onClick={() => { setPipelineName(''); setPipelineDialog(true); }}
                    className="bg-violet-600 hover:bg-violet-500 gap-2 text-sm">
                    <Plus className="h-4 w-4" /> New Pipeline
                </Button>
            </div>

            {/* Kanban board */}
            {!activePipeline ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                    <Kanban className="h-12 w-12 opacity-20" />
                    <p className="text-sm">Create a pipeline to get started</p>
                </div>
            ) : (
                <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                    <div className="flex flex-1 gap-4 p-6 overflow-x-auto overflow-y-hidden">
                        {stages.map(stage => (
                            <StageColumn
                                key={stage.id}
                                stage={stage}
                                deals={deals.filter(d => d.stage_id === stage.id)}
                                onAddDeal={openAddDeal}
                                onEditDeal={openEditDeal}
                                onDeleteDeal={deleteDeal}
                            />
                        ))}
                        {stages.length === 0 && (
                            <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
                                This pipeline has no stages.
                            </div>
                        )}
                    </div>
                    <DragOverlay>
                        {dragging && (
                            <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl w-72 opacity-95">
                                <p className="text-sm font-medium text-slate-100">{dragging.title}</p>
                                <p className="text-xs text-slate-400 mt-1">{dragging.currency} {Number(dragging.value).toLocaleString()}</p>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Pipeline create dialog */}
            <Dialog open={pipelineDialog} onOpenChange={setPipelineDialog}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
                    <DialogHeader><DialogTitle>New Pipeline</DialogTitle></DialogHeader>
                    <div className="space-y-1.5 py-2">
                        <Label className="text-slate-300">Pipeline name</Label>
                        <Input value={pipelineName} onChange={e => setPipelineName(e.target.value)}
                            placeholder="Sales Pipeline"
                            className="border-slate-700 bg-slate-800 text-white"
                            onKeyDown={e => e.key === 'Enter' && createPipeline()} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPipelineDialog(false)} className="text-slate-400">Cancel</Button>
                        <Button onClick={createPipeline} disabled={pipelineSaving || !pipelineName.trim()} className="bg-violet-600 hover:bg-violet-500">
                            {pipelineSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deal create/edit dialog */}
            <Dialog open={dealDialog} onOpenChange={setDealDialog}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                    <DialogHeader><DialogTitle>{dealEdit ? 'Edit Deal' : 'New Deal'}</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Title</Label>
                            <Input value={dealForm.title} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Deal title" className="border-slate-700 bg-slate-800 text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Value</Label>
                                <Input type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))}
                                    placeholder="0" className="border-slate-700 bg-slate-800 text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Currency</Label>
                                <Input value={dealForm.currency} onChange={e => setDealForm(f => ({ ...f, currency: e.target.value }))}
                                    placeholder="INR" className="border-slate-700 bg-slate-800 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Stage</Label>
                            <select value={dealForm.stage_id} onChange={e => setDealForm(f => ({ ...f, stage_id: e.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500/50">
                                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Contact</Label>
                            <select value={dealForm.contact_id} onChange={e => setDealForm(f => ({ ...f, contact_id: e.target.value }))}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500/50">
                                <option value="">No contact</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.phone}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Expected close date</Label>
                            <Input type="date" value={dealForm.expected_close_date} onChange={e => setDealForm(f => ({ ...f, expected_close_date: e.target.value }))}
                                className="border-slate-700 bg-slate-800 text-white" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Notes</Label>
                            <textarea value={dealForm.notes} onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2} placeholder="Optional notes..."
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDealDialog(false)} className="text-slate-400">Cancel</Button>
                        <Button onClick={saveDeal} disabled={dealSaving || !dealForm.title.trim()} className="bg-violet-600 hover:bg-violet-500">
                            {dealSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : dealEdit ? 'Save Changes' : 'Create Deal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bot,
    ChevronDown,
    ChevronUp,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

type TriggerType = 'new_message_received' | 'conversation_opened' | 'conversation_closed' | 'keyword_match';
type StepType =
    | 'send_message' | 'send_template' | 'ai_reply' | 'close_conversation'
    | 'add_tag' | 'assign_conversation'
    | 'delay' | 'condition' | 'create_deal' | 'update_contact' | 'send_voice_call';

interface AutomationStep { step_type: StepType; step_config: Record<string, string>; }
interface Automation {
    id: number; name: string;
    trigger_type: TriggerType; trigger_config: Record<string, string>;
    steps: AutomationStep[]; is_active: boolean; run_count: number; created_at: string;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
    new_message_received: 'New message received',
    conversation_opened: 'Conversation opened',
    conversation_closed: 'Conversation closed',
    keyword_match: 'Keyword match',
};

const STEP_LABELS: Record<StepType, string> = {
    send_message: 'Send message',
    send_template: 'Send template',
    ai_reply: 'AI auto-reply',
    close_conversation: 'Close conversation',
    add_tag: 'Add tag',
    assign_conversation: 'Assign conversation',
    delay: 'Wait / Delay',
    condition: 'Condition (if/else)',
    create_deal: 'Create deal',
    update_contact: 'Update contact fields',
    send_voice_call: 'Trigger voice call',
};

const VARIABLE_HINTS = ['{contact.first_name}', '{contact.phone}', '{contact.custom.budget}', '{collected.room_type}'];

const emptyStep = (): AutomationStep => ({ step_type: 'send_message', step_config: { text: '' } });
const emptyForm = () => ({ name: '', trigger_type: 'new_message_received' as TriggerType, trigger_config: {} as Record<string, string>, steps: [emptyStep()], is_active: true });

function StepEditor({ step, index, onChange, onRemove, canRemove }: {
    step: AutomationStep; index: number;
    onChange: (s: AutomationStep) => void; onRemove: () => void; canRemove: boolean;
}) {
    const setConfig = (key: string, val: string) => onChange({ ...step, step_config: { ...step.step_config, [key]: val } });

    const insertVariable = (field: string, variable: string) => {
        const current = step.step_config[field] ?? '';
        setConfig(field, current + variable);
    };

    const VariableHints = ({ field }: { field: string }) => (
        <div className="flex flex-wrap gap-1 mt-1">
            {VARIABLE_HINTS.map(v => (
                <button key={v} type="button" onClick={() => insertVariable(field, v)}
                    className="text-xs px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-violet-400 hover:border-violet-500/50 transition-colors">
                    {v}
                </button>
            ))}
        </div>
    );

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Step {index + 1}</span>
                {canRemove && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-transparent" onClick={onRemove}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
            <Select value={step.step_type} onValueChange={v => onChange({ step_type: v as StepType, step_config: {} })}>
                <SelectTrigger className="h-8 text-sm border-slate-700 bg-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                    {(Object.keys(STEP_LABELS) as StepType[]).map(k => (
                        <SelectItem key={k} value={k} className="text-slate-200 focus:bg-slate-700">{STEP_LABELS[k]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {step.step_type === 'send_message' && (
                <div>
                    <textarea rows={2} value={step.step_config.text ?? ''} onChange={e => setConfig('text', e.target.value)}
                        placeholder="Hello {contact.first_name}! How can I help?" className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none" />
                    <VariableHints field="text" />
                </div>
            )}
            {step.step_type === 'send_template' && (
                <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="hello_world" value={step.step_config.template_name ?? ''} onChange={e => setConfig('template_name', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    <Input placeholder="en_US" value={step.step_config.language ?? 'en_US'} onChange={e => setConfig('language', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                </div>
            )}
            {step.step_type === 'add_tag' && (
                <Input placeholder="hot-lead" value={step.step_config.tag ?? ''} onChange={e => setConfig('tag', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
            )}
            {step.step_type === 'assign_conversation' && (
                <Input placeholder="agent@yourcompany.com" value={step.step_config.agent_email ?? ''} onChange={e => setConfig('agent_email', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
            )}
            {step.step_type === 'delay' && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Hours</label>
                        <Input type="number" min="0" placeholder="0" value={step.step_config.hours ?? ''} onChange={e => setConfig('hours', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Days</label>
                        <Input type="number" min="0" placeholder="0" value={step.step_config.days ?? ''} onChange={e => setConfig('days', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    </div>
                    <p className="col-span-2 text-xs text-slate-500">Next step will run after this delay. Automation pauses here.</p>
                </div>
            )}
            {step.step_type === 'condition' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="contact.custom.score" value={step.step_config.field ?? ''} onChange={e => setConfig('field', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                        <Select value={step.step_config.op ?? 'eq'} onValueChange={v => setConfig('op', v)}>
                            <SelectTrigger className="h-8 text-sm border-slate-700 bg-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {[['eq','='],['neq','≠'],['gte','≥'],['lte','≤'],['gt','>'],['lt','<'],['contains','contains']].map(([v,l]) => (
                                    <SelectItem key={v} value={v} className="text-slate-200 focus:bg-slate-700">{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input placeholder="70" value={step.step_config.value ?? ''} onChange={e => setConfig('value', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    </div>
                    <p className="text-xs text-slate-500">If condition is false, automation stops. If true, continues to next step.</p>
                </div>
            )}
            {step.step_type === 'create_deal' && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Pipeline name</label>
                        <Input placeholder="Bookings" value={step.step_config.pipeline ?? ''} onChange={e => setConfig('pipeline', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Stage name</label>
                        <Input placeholder="New Inquiry" value={step.step_config.stage ?? ''} onChange={e => setConfig('stage', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-400">Deal title</label>
                        <Input placeholder="{contact.first_name} - Booking" value={step.step_config.title ?? ''} onChange={e => setConfig('title', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                        <VariableHints field="title" />
                    </div>
                </div>
            )}
            {step.step_type === 'update_contact' && (
                <div className="space-y-2">
                    <textarea rows={3} value={step.step_config.fields_json ?? ''} onChange={e => setConfig('fields_json', e.target.value)}
                        placeholder={'{"lead_score": "80", "room_type": "{collected.room_type}"}'}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-violet-500/50 resize-none" />
                    <p className="text-xs text-slate-500">JSON object. Keys matching contact fields (first_name, email, etc.) update the contact directly. Others go into custom_fields.</p>
                </div>
            )}
            {step.step_type === 'send_voice_call' && (
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Voice Workflow ID</label>
                    <Input placeholder="{config.voice_workflow_id} or paste workflow ID" value={step.step_config.workflow_id ?? ''} onChange={e => setConfig('workflow_id', e.target.value)} className="h-8 text-sm border-slate-700 bg-slate-800 text-white" />
                </div>
            )}
            {['ai_reply', 'close_conversation'].includes(step.step_type) && (
                <p className="text-xs text-slate-500 italic">No additional configuration required.</p>
            )}
        </div>
    );
}

export default function AutomationsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const headers = useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    }, [getAccessToken]);

    const fetchAutomations = useCallback(async () => {
        if (!user) return;
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/automations`, { headers: await headers() });
            if (r.ok) setAutomations(await r.json());
        } catch (e) { logger.error(`${e}`); }
        setLoading(false);
    }, [user, headers]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchAutomations();
    }, [user, fetchAutomations]);

    const toggleActive = async (a: Automation) => {
        try {
            const r = await fetch(`${API}/api/v1/whatsapp/automations/${a.id}`, {
                method: 'PUT', headers: await headers(), body: JSON.stringify({ ...a, is_active: !a.is_active }),
            });
            if (r.ok) setAutomations(p => p.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
        } catch (e) { logger.error(`${e}`); }
    };

    const deleteAutomation = async (id: number) => {
        if (!confirm('Delete this automation?')) return;
        try {
            await fetch(`${API}/api/v1/whatsapp/automations/${id}`, { method: 'DELETE', headers: await headers() });
            setAutomations(p => p.filter(a => a.id !== id));
        } catch (e) { logger.error(`${e}`); }
    };

    function openCreate() { setEditId(null); setForm(emptyForm()); setDialogOpen(true); }
    function openEdit(a: Automation) {
        setEditId(a.id);
        setForm({ name: a.name, trigger_type: a.trigger_type, trigger_config: { ...a.trigger_config }, steps: a.steps.map(s => ({ ...s, step_config: { ...s.step_config } })), is_active: a.is_active });
        setDialogOpen(true);
    }

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const url = editId ? `${API}/api/v1/whatsapp/automations/${editId}` : `${API}/api/v1/whatsapp/automations`;
            const r = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: await headers(), body: JSON.stringify(form) });
            if (r.ok) { setDialogOpen(false); hasFetched.current = false; fetchAutomations(); }
        } catch (e) { logger.error(`${e}`); }
        setSaving(false);
    };

    const updateStep = (i: number, s: AutomationStep) => setForm(f => ({ ...f, steps: f.steps.map((x, j) => j === i ? s : x) }));
    const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, emptyStep()] }));
    const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }));

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-slate-400" />
                    <span className="font-semibold text-slate-100">Automations</span>
                </div>
                <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500 gap-2 text-sm">
                    <Plus className="h-4 w-4" /> New Automation
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
                    </div>
                ) : automations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
                        <Zap className="h-12 w-12 opacity-20" />
                        <p className="text-sm">No automations yet. Create one to auto-reply to messages.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl">
                        {automations.map(a => (
                            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                                <div className="flex items-center gap-3 p-4">
                                    <Bot className="h-4 w-4 text-violet-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-100 truncate">{a.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">{TRIGGER_LABELS[a.trigger_type]}</span>
                                            <span className="text-xs text-slate-600">{a.run_count} runs</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} className="scale-75" />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-200" onClick={() => openEdit(a)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400" onClick={() => deleteAutomation(a.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-200" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                                            {expandedId === a.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {expandedId === a.id && (
                                    <div className="border-t border-slate-800 px-4 py-3 space-y-1.5">
                                        {a.steps.map((step, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-xs text-slate-600 font-mono w-5 mt-0.5">{i + 1}.</span>
                                                <span className="text-slate-300 font-medium">{STEP_LABELS[step.step_type] ?? step.step_type}</span>
                                                {step.step_config.text && <span className="text-slate-500 truncate max-w-xs">— {step.step_config.text}</span>}
                                                {step.step_config.template_name && <span className="text-slate-500">— {step.step_config.template_name}</span>}
                                                {step.step_config.tag && <span className="text-slate-500">— {step.step_config.tag}</span>}
                                                {step.step_config.hours && <span className="text-slate-500">— {step.step_config.hours}h</span>}
                                                {step.step_config.days && <span className="text-slate-500">— {step.step_config.days}d</span>}
                                                {step.step_config.pipeline && <span className="text-slate-500">— {step.step_config.pipeline} / {step.step_config.stage}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editId ? 'Edit Automation' : 'New Automation'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Name</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Welcome message" className="border-slate-700 bg-slate-800 text-white" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Trigger</Label>
                            <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v as TriggerType, trigger_config: {} }))}>
                                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map(k => <SelectItem key={k} value={k} className="text-slate-200 focus:bg-slate-700">{TRIGGER_LABELS[k]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {form.trigger_type === 'keyword_match' && (
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Keyword</Label>
                                <Input placeholder="hello" value={form.trigger_config.keyword ?? ''}
                                    onChange={e => setForm(f => ({ ...f, trigger_config: { keyword: e.target.value } }))}
                                    className="border-slate-700 bg-slate-800 text-white" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Steps</Label>
                            {form.steps.map((step, i) => (
                                <StepEditor key={i} step={step} index={i} onChange={s => updateStep(i, s)} onRemove={() => removeStep(i)} canRemove={form.steps.length > 1} />
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addStep}
                                className="w-full gap-1.5 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                                <Plus className="h-3.5 w-3.5" /> Add Step
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="is_active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                            <Label htmlFor="is_active" className="text-slate-300">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-violet-600 hover:bg-violet-500">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? 'Save Changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

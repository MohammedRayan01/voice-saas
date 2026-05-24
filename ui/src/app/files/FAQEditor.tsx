'use client';

import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface FAQEntry {
    id: string;
    question: string;
    answer: string;
}

function newEntry(): FAQEntry {
    return { id: crypto.randomUUID(), question: '', answer: '' };
}

export function FAQEditor() {
    const { user, getAccessToken } = useAuth();
    const [entries, setEntries] = useState<FAQEntry[]>([newEntry()]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const updateEntry = (id: string, field: 'question' | 'answer', value: string) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
        setSaved(false);
    };

    const addEntry = () => {
        setEntries((prev) => [...prev, newEntry()]);
        setSaved(false);
    };

    const removeEntry = (id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setSaved(false);
    };

    const handleSave = async () => {
        if (!user) return;
        const valid = entries.filter((e) => e.question.trim() && e.answer.trim());
        if (valid.length === 0) return;

        setSaving(true);
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/knowledge-base/faq`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: valid.map(({ question, answer }) => ({ question, answer })) }),
            });
            if (!res.ok) throw new Error(await res.text());
            setSaved(true);
        } catch (e) {
            logger.error(`FAQ save failed: ${e}`);
        } finally {
            setSaving(false);
        }
    };

    const validCount = entries.filter((e) => e.question.trim() && e.answer.trim()).length;

    return (
        <div className="max-w-3xl space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>FAQ / Fact Sheet</CardTitle>
                    <CardDescription>
                        Add question-and-answer pairs your voice agents can look up during calls. These are stored in your knowledge base and searched semantically — agents find the right answer even if the caller doesn&apos;t use exact phrasing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {entries.map((entry, idx) => (
                        <div key={entry.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Entry {idx + 1}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeEntry(entry.id)}
                                    disabled={entries.length === 1}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Question</Label>
                                <Input
                                    placeholder="e.g. What are your business hours?"
                                    value={entry.question}
                                    onChange={(e) => updateEntry(entry.id, 'question', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Answer</Label>
                                <Textarea
                                    placeholder="e.g. We're open Monday to Friday, 9am to 6pm."
                                    value={entry.answer}
                                    onChange={(e) => updateEntry(entry.id, 'answer', e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" size="sm" onClick={addEntry} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Entry
                    </Button>
                </CardContent>
            </Card>

            <div className="flex items-center gap-3">
                <Button
                    onClick={handleSave}
                    disabled={saving || validCount === 0}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : `Save ${validCount} FAQ${validCount !== 1 ? 's' : ''} to Knowledge Base`}
                </Button>
                {saved && (
                    <span className="text-sm text-green-600 dark:text-green-400">
                        Saved — agents can now search these facts during calls.
                    </span>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Saving replaces any previous FAQ sheet. The knowledge base search tool must be attached to your workflow node for agents to use these facts.
            </p>
        </div>
    );
}

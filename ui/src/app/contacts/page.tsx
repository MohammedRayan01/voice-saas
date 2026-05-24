'use client';

import {
    Mail,
    Phone,
    Plus,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface Contact {
    id: number;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    company?: string;
    job_title?: string;
    notes?: string;
    tags: string[];
    custom_fields: Record<string, string>;
    created_at: string;
}

const emptyForm = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    company: '',
    job_title: '',
    notes: '',
    tags: [] as string[],
};

export default function ContactsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const [showDialog, setShowDialog] = useState(false);
    const [editContact, setEditContact] = useState<Contact | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchContacts = async (q?: string) => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await getAccessToken();
            const params = new URLSearchParams({ limit: '50' });
            if (q) params.set('search', q);
            const res = await fetch(`${API_BASE}/api/v1/contacts?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts);
                setTotal(data.total);
            }
        } catch (e) {
            logger.error(`Failed to fetch contacts: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchContacts();
    }, [user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchContacts(searchInput || undefined);
    };

    const openCreate = () => {
        setEditContact(null);
        setForm(emptyForm);
        setTagInput('');
        setShowDialog(true);
    };

    const openEdit = (c: Contact) => {
        setEditContact(c);
        setForm({
            first_name: c.first_name ?? '',
            last_name: c.last_name ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            company: c.company ?? '',
            job_title: c.job_title ?? '',
            notes: c.notes ?? '',
            tags: c.tags ?? [],
        });
        setTagInput('');
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const token = await getAccessToken();
            const body = { ...form };
            if (editContact) {
                await fetch(`${API_BASE}/api/v1/contacts/${editContact.id}`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } else {
                await fetch(`${API_BASE}/api/v1/contacts`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }
            setShowDialog(false);
            fetchContacts(search || undefined);
        } catch (e) {
            logger.error(`Failed to save contact: ${e}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!user || !confirm('Delete this contact?')) return;
        try {
            const token = await getAccessToken();
            await fetch(`${API_BASE}/api/v1/contacts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setContacts((prev) => prev.filter((c) => c.id !== id));
            setTotal((t) => t - 1);
        } catch (e) {
            logger.error(`Failed to delete contact: ${e}`);
        }
    };

    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !form.tags.includes(tag)) {
            setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
    };

    const displayName = (c: Contact) =>
        [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.phone || 'Unnamed';

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Contacts</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {total} contact{total !== 1 ? 's' : ''} — used for caller lookup during live calls.
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Contact
                </Button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <Input
                    placeholder="Search by name, phone, email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button type="submit" variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                </Button>
            </form>

            {/* Contact list */}
            {loading ? (
                <div className="text-muted-foreground text-sm py-8">Loading...</div>
            ) : contacts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <User className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground text-sm">
                            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first one.'}
                        </p>
                        {!search && (
                            <Button onClick={openCreate} variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Add Contact
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {contacts.map((c) => (
                        <Card
                            key={c.id}
                            className="group cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openEdit(c)}
                        >
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                            {displayName(c)[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{displayName(c)}</p>
                                            {c.company && (
                                                <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="mt-3 space-y-1">
                                    {c.phone && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Phone className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{c.phone}</span>
                                        </div>
                                    )}
                                    {c.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Mail className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{c.email}</span>
                                        </div>
                                    )}
                                </div>

                                {c.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {c.tags.map((t) => (
                                            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    value={form.first_name}
                                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    value={form.last_name}
                                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                placeholder="+1 555 000 0000"
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    value={form.company}
                                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="job_title">Job Title</Label>
                                <Input
                                    id="job_title"
                                    value={form.job_title}
                                    onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tags</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add tag..."
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                            </div>
                            {form.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {form.tags.map((t) => (
                                        <Badge
                                            key={t}
                                            variant="secondary"
                                            className="cursor-pointer text-xs"
                                            onClick={() => removeTag(t)}
                                        >
                                            {t} ×
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : (editContact ? 'Save Changes' : 'Add Contact')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

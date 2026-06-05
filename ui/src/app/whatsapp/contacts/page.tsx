'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
const PAGE_SIZE = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
    id: number;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    company?: string;
    tags: string[];
    created_at: string;
}

interface FormState {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    company: string;
    tags: string;
}

const emptyForm = (): FormState => ({
    first_name: '', last_name: '', phone: '', email: '', company: '', tags: '',
});

function fullName(c: Contact): string {
    return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.phone || `#${c.id}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);

    const [formOpen, setFormOpen] = useState(false);
    const [editContact, setEditContact] = useState<Contact | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
    const [deleting, setDeleting] = useState(false);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    // reset page on search change
    useEffect(() => { setPage(0); }, [debouncedSearch]);

    const headers = useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    }, [getAccessToken]);

    const fetchContacts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
            if (debouncedSearch) params.set('search', debouncedSearch);
            const r = await fetch(`${API}/api/v1/whatsapp/contacts?${params}`, { headers: await headers() });
            if (r.ok) setContacts(await r.json());
        } catch (e) { logger.error(`${e}`); }
        setLoading(false);
    }, [user, page, debouncedSearch, headers]);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchContacts();
    }, [user, fetchContacts]);

    useEffect(() => {
        if (!hasFetched.current) return;
        fetchContacts();
    }, [page, debouncedSearch]); // eslint-disable-line

    function openAdd() { setEditContact(null); setForm(emptyForm()); setFormOpen(true); }
    function openEdit(c: Contact) {
        setEditContact(c);
        setForm({
            first_name: c.first_name ?? '',
            last_name: c.last_name ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            company: c.company ?? '',
            tags: (c.tags ?? []).join(', '),
        });
        setFormOpen(true);
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        try {
            const body = {
                first_name: form.first_name || null,
                last_name: form.last_name || null,
                phone: form.phone || null,
                email: form.email || null,
                company: form.company || null,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            };
            const url = editContact
                ? `${API}/api/v1/whatsapp/contacts/${editContact.id}`
                : `${API}/api/v1/whatsapp/contacts`;
            const r = await fetch(url, {
                method: editContact ? 'PUT' : 'POST',
                headers: await headers(),
                body: JSON.stringify(body),
            });
            if (r.ok) { setFormOpen(false); hasFetched.current = false; fetchContacts(); }
        } catch (e) { logger.error(`${e}`); }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await fetch(`${API}/api/v1/whatsapp/contacts/${deleteTarget.id}`, {
                method: 'DELETE', headers: await headers(),
            });
            setContacts(p => p.filter(c => c.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e) { logger.error(`${e}`); }
        setDeleting(false);
    }

    const hasPrev = page > 0;
    const hasNext = contacts.length === PAGE_SIZE;

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-950 min-h-full text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Contacts</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage your WhatsApp contacts.</p>
                </div>
                <Button onClick={openAdd} className="bg-violet-600 hover:bg-violet-500 gap-2">
                    <Plus className="h-4 w-4" /> New Contact
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, phone, email..."
                    className="pl-9 border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:border-violet-500/50" />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-slate-400">Phone</TableHead>
                            <TableHead className="hidden md:table-cell text-slate-400">Email</TableHead>
                            <TableHead className="hidden lg:table-cell text-slate-400">Company</TableHead>
                            <TableHead className="hidden md:table-cell text-slate-400">Tags</TableHead>
                            <TableHead className="hidden lg:table-cell text-slate-400">Created</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : contacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    No contacts found.
                                </TableCell>
                            </TableRow>
                        ) : contacts.map(c => (
                            <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/40">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-semibold shrink-0">
                                            {fullName(c).slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-slate-100">{fullName(c)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-300">{c.phone ?? '—'}</TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-slate-400">{c.email ?? '—'}</TableCell>
                                <TableCell className="hidden lg:table-cell text-sm text-slate-400">{c.company ?? '—'}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                        {(c.tags ?? []).map(tag => (
                                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-200">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                            <DropdownMenuItem onClick={() => openEdit(c)} className="text-slate-200 focus:bg-slate-700 gap-2">
                                                <Pencil className="h-3.5 w-3.5" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-700" />
                                            <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-red-400 focus:bg-slate-700 focus:text-red-400 gap-2">
                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {page + 1}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!hasPrev}
                        className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 gap-1">
                        <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNext}
                        className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 gap-1">
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Create/Edit dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editContact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">First name</Label>
                                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                                    className="border-slate-700 bg-slate-800 text-white" placeholder="John" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-300">Last name</Label>
                                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                                    className="border-slate-700 bg-slate-800 text-white" placeholder="Doe" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Phone</Label>
                            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                className="border-slate-700 bg-slate-800 text-white" placeholder="+91..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Email</Label>
                            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="border-slate-700 bg-slate-800 text-white" placeholder="john@example.com" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Company</Label>
                            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                className="border-slate-700 bg-slate-800 text-white" placeholder="Acme Corp" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-300">Tags <span className="text-slate-500 font-normal">(comma separated)</span></Label>
                            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                className="border-slate-700 bg-slate-800 text-white" placeholder="vip, lead" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setFormOpen(false)} className="text-slate-400">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-500">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editContact ? 'Save Changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Contact</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete <span className="font-medium text-slate-200">{deleteTarget ? fullName(deleteTarget) : ''}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-slate-400">Cancel</Button>
                        <Button onClick={handleDelete} disabled={deleting} variant="destructive">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

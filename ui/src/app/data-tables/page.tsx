'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChevronDown,
    Database,
    Download,
    Edit2,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Table2,
    Trash2,
    Upload,
    X,
} from 'lucide-react';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'list' | 'link';

interface Column {
    name: string;
    type: ColumnType;
    required: boolean;
    description?: string;
}

interface DataTable {
    id: number;
    name: string;
    description?: string;
    columns: Column[];
    row_count: number;
    created_at: string;
    updated_at: string;
}

interface DataRow {
    id: number;
    data: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

const COLUMN_TYPES: { value: ColumnType; label: string; description: string }[] = [
    { value: 'text', label: 'Text', description: 'Names, descriptions, any text' },
    { value: 'number', label: 'Number', description: 'Prices, quantities, scores' },
    { value: 'boolean', label: 'Yes / No', description: 'Availability, flags, toggles' },
    { value: 'date', label: 'Date', description: 'Booking dates, expiry, events' },
    { value: 'list', label: 'List', description: 'Tags, features, multiple values' },
    { value: 'link', label: 'Link', description: 'URLs to images, brochures, pages' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataTablesPage() {
    const { user, loading: authLoading, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [tables, setTables] = useState<DataTable[]>([]);
    const [selectedTable, setSelectedTable] = useState<DataTable | null>(null);
    const [rows, setRows] = useState<DataRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [rowsLoading, setRowsLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Dialog state
    const [showCreateTable, setShowCreateTable] = useState(false);
    const [showEditTable, setShowEditTable] = useState(false);
    const [showCreateRow, setShowCreateRow] = useState(false);
    const [showEditRow, setShowEditRow] = useState<DataRow | null>(null);
    const [showImport, setShowImport] = useState(false);

    const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
        const token = await getAccessToken();
        return fetch(url, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(opts.headers ?? {}),
            },
        });
    }, [getAccessToken]);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API}/api/v1/data-tables`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
                if (data.length > 0 && !selectedTable) {
                    setSelectedTable(data[0]);
                }
            }
        } catch (err) {
            logger.error('fetchTables', err);
        } finally {
            setLoading(false);
        }
    }, [authFetch, selectedTable]);

    const fetchRows = useCallback(async (tableId: number) => {
        setRowsLoading(true);
        try {
            const res = await authFetch(`${API}/api/v1/data-tables/${tableId}/rows?limit=200`);
            if (res.ok) {
                const data = await res.json();
                setRows(data);
            }
        } catch (err) {
            logger.error('fetchRows', err);
        } finally {
            setRowsLoading(false);
        }
    }, [authFetch]);

    useEffect(() => {
        if (authLoading || !user || hasFetched.current) return;
        hasFetched.current = true;
        fetchTables();
    }, [authLoading, user, fetchTables]);

    useEffect(() => {
        if (selectedTable) fetchRows(selectedTable.id);
    }, [selectedTable, fetchRows]);

    const deleteTable = async (tableId: number) => {
        if (!confirm('Delete this table and all its rows? This cannot be undone.')) return;
        await authFetch(`${API}/api/v1/data-tables/${tableId}`, { method: 'DELETE' });
        setTables(t => t.filter(x => x.id !== tableId));
        if (selectedTable?.id === tableId) {
            const remaining = tables.filter(x => x.id !== tableId);
            setSelectedTable(remaining[0] ?? null);
        }
    };

    const deleteRow = async (rowId: number) => {
        if (!selectedTable) return;
        await authFetch(`${API}/api/v1/data-tables/${selectedTable.id}/rows/${rowId}`, { method: 'DELETE' });
        setRows(r => r.filter(x => x.id !== rowId));
        setTables(t => t.map(x => x.id === selectedTable.id ? { ...x, row_count: x.row_count - 1 } : x));
    };

    const filteredRows = search
        ? rows.filter(row =>
            Object.values(row.data).some(v =>
                String(v).toLowerCase().includes(search.toLowerCase())
            )
        )
        : rows;

    return (
        <div className="flex h-screen bg-background">
            {/* Left sidebar: table list */}
            <div className="w-64 border-r flex flex-col shrink-0">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Data Tables</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowCreateTable(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Table2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground">No tables yet</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 text-xs"
                                onClick={() => setShowCreateTable(true)}
                            >
                                Create your first table
                            </Button>
                        </div>
                    ) : (
                        tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table)}
                                className={cn(
                                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                                    selectedTable?.id === table.id
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{table.name}</span>
                                    <Badge variant="secondary" className="text-xs ml-1 shrink-0">
                                        {table.row_count}
                                    </Badge>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setShowCreateTable(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        New Table
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedTable ? (
                    <>
                        {/* Table header */}
                        <div className="border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-semibold">{selectedTable.name}</h1>
                                {selectedTable.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5">{selectedTable.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search rows..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-8 h-8 text-sm w-48"
                                    />
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                                    <Upload className="h-3.5 w-3.5 mr-1" />
                                    Import CSV
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setShowEditTable(true)}>
                                            <Edit2 className="h-3.5 w-3.5 mr-2" />
                                            Edit table schema
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => deleteTable(selectedTable.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                            Delete table
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button size="sm" onClick={() => setShowCreateRow(true)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Row
                                </Button>
                            </div>
                        </div>

                        {/* Table grid */}
                        <div className="flex-1 overflow-auto">
                            {rowsLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : selectedTable.columns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                                    <Table2 className="h-10 w-10 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">No columns defined</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Edit the table schema to add columns first, then you can add rows.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setShowEditTable(true)}>
                                        Add columns
                                    </Button>
                                </div>
                            ) : (
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 bg-muted/50 border-b z-10">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-12">#</th>
                                            {selectedTable.columns.map(col => (
                                                <th key={col.name} className="text-left px-4 py-2.5 font-medium text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{col.name}</span>
                                                        <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                                                            {col.type}
                                                        </Badge>
                                                        {col.required && <span className="text-destructive text-[10px]">*</span>}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="w-10" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={selectedTable.columns.length + 2} className="text-center py-16 text-muted-foreground text-sm">
                                                    {search ? 'No rows match your search' : 'No rows yet — click Add Row to get started'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRows.map((row, idx) => (
                                                <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors group">
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                                                    {selectedTable.columns.map(col => (
                                                        <td key={col.name} className="px-4 py-2.5 max-w-[200px]">
                                                            <CellValue value={row.data[col.name]} type={col.type} />
                                                        </td>
                                                    ))}
                                                    <td className="px-2 py-2.5">
                                                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => setShowEditRow(row)}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                                onClick={() => deleteRow(row.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Row count footer */}
                        <div className="border-t px-6 py-2 text-xs text-muted-foreground flex items-center justify-between">
                            <span>
                                {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
                                {search && ` (filtered from ${rows.length})`}
                            </span>
                            <span>Last updated: {new Date(selectedTable.updated_at).toLocaleDateString()}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                        <Database className="h-12 w-12 text-muted-foreground" />
                        <div>
                            <h2 className="text-xl font-semibold">Data Tables</h2>
                            <p className="text-muted-foreground mt-2 max-w-md">
                                Store your rooms, products, properties, and inventory here. Your AI can query these tables
                                mid-conversation so it always has accurate, up-to-date information.
                            </p>
                        </div>
                        <Button onClick={() => setShowCreateTable(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first table
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Dialogs ── */}

            {showCreateTable && (
                <CreateTableDialog
                    onClose={() => setShowCreateTable(false)}
                    onCreated={(table) => {
                        setTables(t => [...t, table]);
                        setSelectedTable(table);
                        setRows([]);
                        setShowCreateTable(false);
                    }}
                    authFetch={authFetch}
                />
            )}

            {showEditTable && selectedTable && (
                <EditTableDialog
                    table={selectedTable}
                    onClose={() => setShowEditTable(false)}
                    onSaved={(updated) => {
                        setTables(t => t.map(x => x.id === updated.id ? updated : x));
                        setSelectedTable(updated);
                        setShowEditTable(false);
                    }}
                    authFetch={authFetch}
                />
            )}

            {showCreateRow && selectedTable && (
                <RowDialog
                    table={selectedTable}
                    row={null}
                    onClose={() => setShowCreateRow(false)}
                    onSaved={(row) => {
                        setRows(r => [...r, row]);
                        setTables(t => t.map(x => x.id === selectedTable.id ? { ...x, row_count: x.row_count + 1 } : x));
                        setShowCreateRow(false);
                    }}
                    authFetch={authFetch}
                />
            )}

            {showEditRow && selectedTable && (
                <RowDialog
                    table={selectedTable}
                    row={showEditRow}
                    onClose={() => setShowEditRow(null)}
                    onSaved={(updated) => {
                        setRows(r => r.map(x => x.id === updated.id ? updated : x));
                        setShowEditRow(null);
                    }}
                    authFetch={authFetch}
                />
            )}

            {showImport && selectedTable && (
                <ImportDialog
                    table={selectedTable}
                    onClose={() => setShowImport(false)}
                    onImported={() => {
                        fetchRows(selectedTable.id);
                        fetchTables();
                        setShowImport(false);
                    }}
                    authFetch={authFetch}
                />
            )}
        </div>
    );
}

// ─── Cell value display ────────────────────────────────────────────────────────

function CellValue({ value, type }: { value: unknown; type: ColumnType }) {
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground/50 text-xs">—</span>;
    }

    if (type === 'boolean') {
        const isTrue = String(value).toLowerCase() === 'true' || value === true || String(value) === '1';
        return (
            <Badge variant={isTrue ? 'default' : 'secondary'} className="text-xs">
                {isTrue ? 'Yes' : 'No'}
            </Badge>
        );
    }

    if (type === 'link') {
        return (
            <a href={String(value)} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline text-xs truncate block max-w-[160px]">
                {String(value)}
            </a>
        );
    }

    if (type === 'list') {
        const items = String(value).split(',').map(s => s.trim()).filter(Boolean);
        return (
            <div className="flex flex-wrap gap-1">
                {items.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{item}</Badge>
                ))}
            </div>
        );
    }

    return <span className="truncate block max-w-[160px] text-xs">{String(value)}</span>;
}

// ─── Create Table Dialog ───────────────────────────────────────────────────────

function CreateTableDialog({
    onClose,
    onCreated,
    authFetch,
}: {
    onClose: () => void;
    onCreated: (table: DataTable) => void;
    authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [columns, setColumns] = useState<Column[]>([
        { name: '', type: 'text', required: false },
    ]);
    const [saving, setSaving] = useState(false);

    const addColumn = () => setColumns(c => [...c, { name: '', type: 'text', required: false }]);
    const removeColumn = (i: number) => setColumns(c => c.filter((_, idx) => idx !== i));
    const updateColumn = (i: number, patch: Partial<Column>) =>
        setColumns(c => c.map((col, idx) => idx === i ? { ...col, ...patch } : col));

    const save = async () => {
        if (!name.trim()) return;
        const validCols = columns.filter(c => c.name.trim());
        setSaving(true);
        try {
            const res = await authFetch(`${API}/api/v1/data-tables`, {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, columns: validCols }),
            });
            if (res.ok) {
                const table = await res.json();
                onCreated(table);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Data Table</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Table name *</Label>
                            <Input
                                placeholder="e.g. Rooms, Products, Property Listings"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description (optional)</Label>
                            <Input
                                placeholder="What is this table for?"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Columns</Label>
                            <Button size="sm" variant="outline" onClick={addColumn}>
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add column
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {columns.map((col, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Column name"
                                        value={col.name}
                                        onChange={e => updateColumn(i, { name: e.target.value })}
                                        className="flex-1"
                                    />
                                    <Select value={col.type} onValueChange={v => updateColumn(i, { type: v as ColumnType })}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLUMN_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-muted-foreground"
                                        onClick={() => removeColumn(i)}
                                        disabled={columns.length === 1}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={!name.trim() || saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Table
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit Table Schema Dialog ─────────────────────────────────────────────────

function EditTableDialog({
    table,
    onClose,
    onSaved,
    authFetch,
}: {
    table: DataTable;
    onClose: () => void;
    onSaved: (table: DataTable) => void;
    authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}) {
    const [name, setName] = useState(table.name);
    const [description, setDescription] = useState(table.description ?? '');
    const [columns, setColumns] = useState<Column[]>(table.columns.length > 0 ? table.columns : [{ name: '', type: 'text', required: false }]);
    const [saving, setSaving] = useState(false);

    const addColumn = () => setColumns(c => [...c, { name: '', type: 'text', required: false }]);
    const removeColumn = (i: number) => setColumns(c => c.filter((_, idx) => idx !== i));
    const updateColumn = (i: number, patch: Partial<Column>) =>
        setColumns(c => c.map((col, idx) => idx === i ? { ...col, ...patch } : col));

    const save = async () => {
        const validCols = columns.filter(c => c.name.trim());
        setSaving(true);
        try {
            const res = await authFetch(`${API}/api/v1/data-tables/${table.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, columns: validCols }),
            });
            if (res.ok) {
                const updated = await res.json();
                onSaved(updated);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Table Schema</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Table name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Columns</Label>
                            <Button size="sm" variant="outline" onClick={addColumn}>
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add column
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {columns.map((col, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Column name"
                                        value={col.name}
                                        onChange={e => updateColumn(i, { name: e.target.value })}
                                        className="flex-1"
                                    />
                                    <Select value={col.type} onValueChange={v => updateColumn(i, { type: v as ColumnType })}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLUMN_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => removeColumn(i)}
                                        disabled={columns.length === 1}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Row Dialog (create + edit) ───────────────────────────────────────────────

function RowDialog({
    table,
    row,
    onClose,
    onSaved,
    authFetch,
}: {
    table: DataTable;
    row: DataRow | null;
    onClose: () => void;
    onSaved: (row: DataRow) => void;
    authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}) {
    const [values, setValues] = useState<Record<string, string>>(
        table.columns.reduce((acc, col) => ({
            ...acc,
            [col.name]: row ? String(row.data[col.name] ?? '') : '',
        }), {})
    );
    const [saving, setSaving] = useState(false);

    const setValue = (col: string, val: string) =>
        setValues(v => ({ ...v, [col]: val }));

    const save = async () => {
        // Remove empty values to keep JSON clean
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(values)) {
            if (v.trim() !== '') data[k] = v.trim();
        }

        setSaving(true);
        try {
            const url = row
                ? `${API}/api/v1/data-tables/${table.id}/rows/${row.id}`
                : `${API}/api/v1/data-tables/${table.id}/rows`;
            const res = await authFetch(url, {
                method: row ? 'PUT' : 'POST',
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const saved = await res.json();
                onSaved(saved);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{row ? 'Edit Row' : 'Add Row'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {table.columns.map(col => (
                        <div key={col.name} className="space-y-1.5">
                            <Label>
                                {col.name}
                                {col.required && <span className="text-destructive ml-1">*</span>}
                                <span className="text-xs text-muted-foreground ml-2 font-normal">({col.type})</span>
                            </Label>
                            {col.type === 'boolean' ? (
                                <Select value={values[col.name]} onValueChange={v => setValue(col.name, v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Yes</SelectItem>
                                        <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : col.type === 'link' ? (
                                <Input
                                    type="url"
                                    placeholder="https://..."
                                    value={values[col.name]}
                                    onChange={e => setValue(col.name, e.target.value)}
                                />
                            ) : col.description ? (
                                <>
                                    <Input
                                        value={values[col.name]}
                                        onChange={e => setValue(col.name, e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">{col.description}</p>
                                </>
                            ) : (
                                <Input
                                    value={values[col.name]}
                                    onChange={e => setValue(col.name, e.target.value)}
                                    placeholder={col.type === 'list' ? 'item1, item2, item3' : ''}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {row ? 'Save Changes' : 'Add Row'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Import CSV Dialog ─────────────────────────────────────────────────────────

function ImportDialog({
    table,
    onClose,
    onImported,
    authFetch,
}: {
    table: DataTable;
    onClose: () => void;
    onImported: () => void;
    authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}) {
    const [csvText, setCsvText] = useState('');
    const [replaceAll, setReplaceAll] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<Record<string, string>[]>([]);

    const parseCsv = (text: string): Record<string, string>[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] ?? '' }), {});
        });
    };

    const handleTextChange = (text: string) => {
        setCsvText(text);
        setPreview(parseCsv(text).slice(0, 5));
    };

    const doImport = async () => {
        const rows = parseCsv(csvText);
        if (rows.length === 0) return;
        setSaving(true);
        try {
            const res = await authFetch(`${API}/api/v1/data-tables/${table.id}/import`, {
                method: 'POST',
                body: JSON.stringify({ rows, replace_all: replaceAll }),
            });
            if (res.ok) onImported();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import CSV into {table.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Paste your CSV data</Label>
                        <p className="text-xs text-muted-foreground">
                            First row should be column headers matching your table columns:
                            {' '}<strong>{table.columns.map(c => c.name).join(', ')}</strong>
                        </p>
                        <Textarea
                            placeholder={`${table.columns.map(c => c.name).join(',')}\nvalue1,value2,...`}
                            value={csvText}
                            onChange={e => handleTextChange(e.target.value)}
                            rows={8}
                            className="font-mono text-xs"
                        />
                    </div>
                    {preview.length > 0 && (
                        <div className="space-y-1.5">
                            <Label>Preview (first {preview.length} rows)</Label>
                            <div className="rounded border overflow-auto">
                                <table className="text-xs w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {Object.keys(preview[0]).map(h => (
                                                <th key={h} className="text-left px-3 py-1.5 font-medium">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i} className="border-t">
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} className="px-3 py-1.5">{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="replace_all"
                            checked={replaceAll}
                            onChange={e => setReplaceAll(e.target.checked)}
                            className="rounded"
                        />
                        <Label htmlFor="replace_all" className="cursor-pointer font-normal text-sm">
                            Replace all existing rows (delete before importing)
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={doImport} disabled={saving || preview.length === 0}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Import {parseCsv(csvText).length > 0 ? `${parseCsv(csvText).length} rows` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

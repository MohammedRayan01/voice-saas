"use client";

import { Copy, Plus, Send, Trash2, Webhook } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const ALL_EVENTS = [
  "call.started",
  "call.ended",
  "call.transferred",
  "call.failed",
  "appointment.booked",
  "campaign.completed",
];

interface WebhookSub {
  id: number;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
}

export function WebhooksSection() {
  const { user, loading: authLoading, getAccessToken } = useAuth();
  const hasFetched = useRef(false);
  const [webhooks, setWebhooks] = useState<WebhookSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", secret: "", events: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    fetchWebhooks();
  }, [authLoading, user]);

  const authHeaders = async () => {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/webhooks", { headers: await authHeaders() });
      if (res.ok) setWebhooks(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ name: "", url: "", secret: "", events: [] });
        await fetchWebhooks();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE", headers: await authHeaders() });
    await fetchWebhooks();
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      await fetch(`/api/v1/webhooks/${id}/test`, { method: "POST", headers: await authHeaders() });
    } catch {
      // silent
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4 text-primary" />
                Webhook Subscriptions
              </CardTitle>
              <CardDescription className="mt-1">
                Receive real-time events for calls, campaigns, and appointments.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gradient-primary text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="py-8 text-center">
              <Webhook className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No webhooks yet. Add one to receive events.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {webhooks.map((wh) => (
                <div key={wh.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{wh.name || "Webhook"}</p>
                        <Badge className={`text-xs ${wh.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {wh.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{wh.url}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(wh.url)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTest(wh.id)}
                        disabled={testingId === wh.id}
                        title="Send test ping"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(wh.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Webhook</DialogTitle>
            <DialogDescription>Configure a URL to receive platform events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                placeholder="My CRM webhook"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wh-url">Endpoint URL *</Label>
              <Input
                id="wh-url"
                placeholder="https://yourapp.com/webhooks"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wh-secret">Signing Secret</Label>
              <Input
                id="wh-secret"
                placeholder="Optional HMAC secret"
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Used to sign payloads with X-Signature-SHA256.</p>
            </div>
            <div>
              <Label className="mb-2 block">Events * <span className="text-muted-foreground font-normal">(select at least one)</span></Label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleEvent(e)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      form.events.includes(e)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.url.trim() || form.events.length === 0}
              className="gradient-primary text-white"
            >
              {saving ? "Creating…" : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

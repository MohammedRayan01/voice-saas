'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';

import { getWorkflowsSummaryApiV1WorkflowSummaryGet } from '@/client/sdk.gen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LLMConfigSelector } from '@/components/LLMConfigSelector';
import PackGallery, { type PackMeta } from '@/components/whatsapp/PackGallery';
import IndustryPackWizard from '@/components/whatsapp/IndustryPackWizard';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

// Providers the WhatsApp text engine can actually talk to (OpenAI-compatible
// clients only — aws_bedrock needs a separate boto3 client, so it's excluded).
const WHATSAPP_LLM_PROVIDERS = ['openai', 'google', 'groq', 'openrouter', 'azure', 'dograh', 'speaches'];

type Tab = 'connection' | 'ai' | 'packs';

interface WorkflowSummary {
    id: number;
    name: string;
}

interface WhatsAppAIConfig {
    workflow_id: number | null;
    llm: {
        provider: string;
        model: string;
        api_key?: string | null;
        base_url?: string | null;
        endpoint?: string | null;
    } | null;
}

interface WaConfig {
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    verify_token: string;
}

const empty: WaConfig = {
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    verify_token: '',
};

export default function WhatsAppSettingsPage() {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);
    const [activeTab, setActiveTab] = useState<Tab>('connection');

    // Connection tab state
    const [form, setForm] = useState<WaConfig>(empty);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');

    // Pack wizard state
    const [wizardPack, setWizardPack] = useState<PackMeta | null>(null);
    const [wizardInitialConfig, setWizardInitialConfig] = useState<Record<string, unknown> | undefined>(undefined);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

    // AI Agent tab state
    const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiSaving, setAiSaving] = useState(false);
    const [aiSaved, setAiSaved] = useState(false);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('none');
    const [llmProvider, setLlmProvider] = useState('');
    const [llmModel, setLlmModel] = useState('');
    const [llmApiKey, setLlmApiKey] = useState('');
    const [llmBaseUrl, setLlmBaseUrl] = useState('');
    const [llmEndpoint, setLlmEndpoint] = useState('');

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        const base = API_BASE || window.location.origin;
        setWebhookUrl(`${base}/api/v1/whatsapp/webhook`);
        fetchConfig();
        fetchWorkflows();
        fetchAIConfig();
    }, [user]);

    const fetchWorkflows = async () => {
        if (!user) return;
        try {
            const token = await getAccessToken();
            const response = await getWorkflowsSummaryApiV1WorkflowSummaryGet({
                headers: { Authorization: `Bearer ${token}` },
                query: { status: 'active' },
            });
            if (response.data) setWorkflows(response.data as WorkflowSummary[]);
        } catch (e) {
            logger.error(`Failed to fetch workflows: ${e}`);
        }
    };

    const fetchAIConfig = async () => {
        if (!user) return;
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/whatsapp/ai-config`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data: WhatsAppAIConfig = await res.json();
                setSelectedWorkflowId(data.workflow_id != null ? String(data.workflow_id) : 'none');
                if (data.llm) {
                    setLlmProvider(data.llm.provider ?? '');
                    setLlmModel(data.llm.model ?? '');
                    setLlmApiKey(data.llm.api_key ?? '');
                    setLlmBaseUrl(data.llm.base_url ?? '');
                    setLlmEndpoint(data.llm.endpoint ?? '');
                }
            }
        } catch (e) {
            logger.error(`Failed to fetch WhatsApp AI config: ${e}`);
        } finally {
            setAiLoading(false);
        }
    };

    const handleSaveAIConfig = async () => {
        if (!user) return;
        setAiSaving(true);
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/whatsapp/ai-config`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workflow_id: selectedWorkflowId === 'none' ? null : Number(selectedWorkflowId),
                    llm: llmProvider
                        ? {
                              provider: llmProvider,
                              model: llmModel,
                              api_key: llmApiKey || null,
                              base_url: llmBaseUrl || null,
                              endpoint: llmEndpoint || null,
                          }
                        : null,
                }),
            });
            if (res.ok) {
                setAiSaved(true);
                setTimeout(() => setAiSaved(false), 3000);
            }
        } catch (e) {
            logger.error(`Failed to save WhatsApp AI config: ${e}`);
        } finally {
            setAiSaving(false);
        }
    };

    const fetchConfig = async () => {
        if (!user) return;
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/whatsapp/config`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setForm({
                    phone_number_id: data.phone_number_id ?? '',
                    waba_id: data.waba_id ?? '',
                    access_token: data.access_token ?? '',
                    verify_token: data.verify_token ?? '',
                });
            }
        } catch (e) {
            logger.error(`Failed to fetch WA config: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const token = await getAccessToken();
            const res = await fetch(`${API_BASE}/api/v1/whatsapp/config`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (e) {
            logger.error(`Failed to save WA config: ${e}`);
        } finally {
            setSaving(false);
        }
    };

    const copyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl).catch(() => {});
    };

    const f = (key: keyof WaConfig) => ({
        value: form[key],
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((prev) => ({ ...prev, [key]: e.target.value })),
    });

    const handleInstall = (pack: PackMeta) => {
        setWizardPack(pack);
        setWizardInitialConfig(undefined);
        setWizardOpen(true);
    };

    const handleManage = (pack: PackMeta, installed: { config: Record<string, unknown> }) => {
        setWizardPack(pack);
        setWizardInitialConfig(installed.config);
        setWizardOpen(true);
    };

    const handleWizardSuccess = () => {
        setGalleryRefreshKey((k) => k + 1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold">WhatsApp Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Configure your Meta connection and install industry AI packs.
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b">
                {(['connection', 'ai', 'packs'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                            activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'connection' ? 'Connection' : tab === 'ai' ? 'AI Agent' : 'Industry Packs'}
                    </button>
                ))}
            </div>

            {/* Connection Tab */}
            {activeTab === 'connection' && (
                <div className="space-y-6">
                    {/* Webhook URL */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Webhook URL</CardTitle>
                            <CardDescription>
                                Paste this URL in your Meta App Dashboard under WhatsApp → Configuration → Webhook.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
                                <Button variant="outline" size="icon" onClick={copyWebhook} title="Copy">
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <a
                                    href="https://developers.facebook.com/apps"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Button variant="outline" size="icon" title="Open Meta Dashboard">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Credentials */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">API Credentials</CardTitle>
                            <CardDescription>
                                Found in Meta Business Suite → WhatsApp → API Setup.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                                <Input
                                    id="phone_number_id"
                                    placeholder="123456789012345"
                                    {...f('phone_number_id')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
                                <Input
                                    id="waba_id"
                                    placeholder="987654321098765"
                                    {...f('waba_id')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="access_token">Permanent Access Token</Label>
                                <Input
                                    id="access_token"
                                    type="password"
                                    placeholder="EAAxxxxxxxx..."
                                    {...f('access_token')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="verify_token">Webhook Verify Token</Label>
                                <Input
                                    id="verify_token"
                                    placeholder="my_secret_verify_token"
                                    {...f('verify_token')}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Any string you choose — paste the same value in Meta&apos;s webhook verification field.
                                </p>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="gap-2">
                                {saved ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Saved
                                    </>
                                ) : saving ? (
                                    'Saving...'
                                ) : (
                                    'Save Configuration'
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* AI Agent Tab */}
            {activeTab === 'ai' && !aiLoading && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Connected Agent</CardTitle>
                            <CardDescription>
                                Pick which of your voice agents replies to WhatsApp messages. Its prompt, tools, and
                                knowledge base are used to generate replies.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="wa-agent">Agent</Label>
                                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                                    <SelectTrigger id="wa-agent">
                                        <SelectValue placeholder="Select an agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (automations only)</SelectItem>
                                        {workflows.map((wf) => (
                                            <SelectItem key={wf.id} value={String(wf.id)}>
                                                {wf.name} (#{wf.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Only the published version of this agent is used — publish after edits for
                                    changes to take effect on WhatsApp.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">AI Model</CardTitle>
                            <CardDescription>
                                The LLM that generates WhatsApp replies. Separate from the model used by your voice
                                agents on calls.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <LLMConfigSelector
                                provider={llmProvider}
                                onProviderChange={setLlmProvider}
                                model={llmModel}
                                onModelChange={setLlmModel}
                                apiKey={llmApiKey}
                                onApiKeyChange={setLlmApiKey}
                                allowedProviders={WHATSAPP_LLM_PROVIDERS}
                            />
                            {(llmProvider === 'openrouter' || llmProvider === 'speaches') && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="wa-base-url">Base URL</Label>
                                    <Input
                                        id="wa-base-url"
                                        placeholder="https://openrouter.ai/api/v1"
                                        value={llmBaseUrl}
                                        onChange={(e) => setLlmBaseUrl(e.target.value)}
                                    />
                                </div>
                            )}
                            {llmProvider === 'azure' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="wa-endpoint">Azure Endpoint</Label>
                                    <Input
                                        id="wa-endpoint"
                                        placeholder="https://your-resource.openai.azure.com"
                                        value={llmEndpoint}
                                        onChange={(e) => setLlmEndpoint(e.target.value)}
                                    />
                                </div>
                            )}

                            <Button onClick={handleSaveAIConfig} disabled={aiSaving} className="gap-2">
                                {aiSaved ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Saved
                                    </>
                                ) : aiSaving ? (
                                    'Saving...'
                                ) : (
                                    'Save Configuration'
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Industry Packs Tab */}
            {activeTab === 'packs' && (
                <div className="space-y-4">
                    <div>
                        <h2 className="font-semibold">Industry Packs</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Install a pre-built AI automation pack for your industry. Sets up your AI concierge, booking pipeline, and 12+ automations in minutes.
                        </p>
                    </div>
                    <PackGallery
                        key={galleryRefreshKey}
                        onInstall={handleInstall}
                        onManage={handleManage}
                    />
                </div>
            )}

            {/* Pack wizard sheet */}
            <IndustryPackWizard
                pack={wizardPack}
                initialConfig={wizardInitialConfig}
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onSuccess={handleWizardSuccess}
            />
        </div>
    );
}

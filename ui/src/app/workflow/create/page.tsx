'use client';

import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
    createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost,
    createWorkflowRunApiV1WorkflowWorkflowIdRunsPost,
    getWorkflowTemplatesApiV1WorkflowTemplatesGet,
} from '@/client/sdk.gen';
import { DuplicateWorkflowTemplate } from '@/components/workflow/TemplateCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WORKFLOW_RUN_MODES } from '@/constants/workflowRunModes';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import { getRandomId } from '@/lib/utils';

interface WorkflowTemplate {
    id: number;
    template_name: string;
    template_description: string;
    template_json: Record<string, unknown>;
    created_at: string;
}

export default function CreateWorkflowPage() {
    const router = useRouter();
    const { user, loading: authLoading, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [showCustomForm, setShowCustomForm] = useState(false);

    const [callType, setCallType] = useState<'inbound' | 'outbound'>('inbound');
    const [useCase, setUseCase] = useState('');
    const [activityDescription, setActivityDescription] = useState('');

    useEffect(() => {
        if (authLoading || !user || hasFetched.current) return;
        hasFetched.current = true;

        const fetchTemplates = async () => {
            try {
                const accessToken = await getAccessToken();
                const response = await getWorkflowTemplatesApiV1WorkflowTemplatesGet({
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (response.data) {
                    setTemplates(response.data as WorkflowTemplate[]);
                }
            } catch (err) {
                logger.error(`Error fetching templates: ${err}`);
            } finally {
                setTemplatesLoading(false);
            }
        };

        fetchTemplates();
    }, [authLoading, user]);

    const handleCreateWorkflow = async () => {
        if (!useCase || !activityDescription) {
            setError('Please fill in all fields');
            return;
        }
        if (!user) {
            setError('You must be logged in to create a workflow');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const accessToken = await getAccessToken();
            const response = await createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost({
                body: { call_type: callType, use_case: useCase, activity_description: activityDescription },
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.data?.id) {
                setWorkflowId(String(response.data.id));
                setShowSuccessModal(true);
            }
        } catch (err) {
            setError('Failed to create workflow. Please try again.');
            logger.error(`Error creating workflow: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalContinue = async () => {
        if (!workflowId || !user) return;

        try {
            const accessToken = await getAccessToken();
            const workflowRunName = `WR-${getRandomId()}`;

            const response = await createWorkflowRunApiV1WorkflowWorkflowIdRunsPost({
                path: { workflow_id: Number(workflowId) },
                body: { mode: WORKFLOW_RUN_MODES.SMALL_WEBRTC, name: workflowRunName },
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.data?.id) {
                router.push(`/workflow/${workflowId}/run/${response.data.id}`);
            }
        } catch (err) {
            logger.error(`Error creating workflow run: ${err}`);
            router.push(`/workflow/${workflowId}`);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-10 max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create Voice Agent</h1>
                    <p className="text-muted-foreground">
                        Start from a template or describe your use case and let AI build it for you.
                    </p>
                </div>

                {/* Template Gallery */}
                <div className="mb-10">
                    <h2 className="text-lg font-semibold mb-4">Start from a Template</h2>

                    {templatesLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading templates...</span>
                        </div>
                    ) : templates.length === 0 ? (
                        <p className="text-muted-foreground py-4">No templates available.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((t) => (
                                <DuplicateWorkflowTemplate
                                    key={t.id}
                                    id={t.id}
                                    title={t.template_name}
                                    description={t.template_description}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-background text-muted-foreground">or build with AI</span>
                    </div>
                </div>

                {/* AI Generator */}
                {!showCustomForm ? (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="lg"
                            className="gap-2"
                            onClick={() => setShowCustomForm(true)}
                        >
                            <Wand2 className="w-4 h-4" />
                            Generate custom agent with AI
                        </Button>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                AI Agent Builder
                            </CardTitle>
                            <CardDescription>
                                Describe your use case and we&apos;ll generate a workflow for you
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="call-type">Call Type</Label>
                                <Select value={callType} onValueChange={(v) => setCallType(v as 'inbound' | 'outbound')}>
                                    <SelectTrigger id="call-type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound">Inbound (Users call AI)</SelectItem>
                                        <SelectItem value="outbound">Outbound (AI calls users)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="use-case">Use Case</Label>
                                <Input
                                    id="use-case"
                                    placeholder="e.g., Lead Qualification, HR Screening, Customer Support"
                                    value={useCase}
                                    onChange={(e) => setUseCase(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="activity-description">Activity Description</Label>
                                <Textarea
                                    id="activity-description"
                                    placeholder="Describe what your voice agent will do..."
                                    value={activityDescription}
                                    onChange={(e) => setActivityDescription(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <div className="flex gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setShowCustomForm(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateWorkflow}
                                    disabled={isLoading || !useCase || !activityDescription}
                                    className="flex-1"
                                >
                                    {isLoading ? 'Creating...' : 'Generate Agent'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-muted rounded-full" />
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold">Creating Your Workflow</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    We&apos;re setting up your voice agent. This will just take a moment...
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Workflow Created Successfully!
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="mt-4 space-y-3">
                                <p>Your voice agent has been generated. Test it with a web call or edit the nodes to customise it further.</p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => router.push(`/workflow/${workflowId}`)}>
                            Edit Workflow
                        </Button>
                        <Button onClick={handleModalContinue}>Start Web Call</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

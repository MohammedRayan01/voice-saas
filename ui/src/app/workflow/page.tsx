"use client";

import { useEffect, useRef, useState } from 'react';

import { getWorkflowsApiV1WorkflowFetchGet } from '@/client/sdk.gen';
import type { WorkflowListResponse } from '@/client/types.gen';
import { CreateWorkflowButton } from "@/components/workflow/CreateWorkflowButton";
import { UploadWorkflowButton } from '@/components/workflow/UploadWorkflowButton';
import { WorkflowTable } from "@/components/workflow/WorkflowTable";
import { useAuth } from '@/lib/auth';

import WorkflowLayout from "./WorkflowLayout";

export default function WorkflowPage() {
    const { user, loading: authLoading, getAccessToken, redirectToLogin } = useAuth();
    const hasFetched = useRef(false);
    const [activeWorkflows, setActiveWorkflows] = useState<WorkflowListResponse[]>([]);
    const [archivedWorkflows, setArchivedWorkflows] = useState<WorkflowListResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            redirectToLogin();
        }
    }, [authLoading, user, redirectToLogin]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (authLoading || !user || hasFetched.current) return;
        hasFetched.current = true;
        (async () => {
            setIsLoading(true);
            try {
                const accessToken = await getAccessToken();
                const response = await getWorkflowsApiV1WorkflowFetchGet({
                    headers: { Authorization: `Bearer ${accessToken}` },
                    query: { status: 'active,archived' },
                });
                const all = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];
                const sorted = (arr: WorkflowListResponse[]) =>
                    arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setActiveWorkflows(sorted(all.filter((w) => w.status === 'active')));
                setArchivedWorkflows(sorted(all.filter((w) => w.status === 'archived')));
            } catch {
                setError('Failed to load workflows. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [authLoading, user]);

    return (
        <WorkflowLayout showFeaturesNav={true}>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Your Agents</h1>
                        <div className="flex gap-2">
                            <UploadWorkflowButton />
                            <CreateWorkflowButton />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-4">Active Agents</h2>
                                {activeWorkflows.length > 0 ? (
                                    <WorkflowTable workflows={activeWorkflows} showArchived={false} />
                                ) : (
                                    <div className="text-muted-foreground bg-muted rounded-lg p-8 text-center">
                                        No active workflows found. Create your first workflow to get started.
                                    </div>
                                )}
                            </div>
                            {archivedWorkflows.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Archived Workflows</h2>
                                    <WorkflowTable workflows={archivedWorkflows} showArchived={true} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </WorkflowLayout>
    );
}

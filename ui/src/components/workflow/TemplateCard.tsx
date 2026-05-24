'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { duplicateWorkflowTemplateApiV1WorkflowTemplatesDuplicatePost } from '@/client/sdk.gen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

interface DuplicateWorkflowTemplateProps {
    id: number;
    title: string;
    description: string;
}

export function DuplicateWorkflowTemplate({ id, title, description }: DuplicateWorkflowTemplateProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { user, getAccessToken } = useAuth();

    const handleUseTemplate = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            const response = await duplicateWorkflowTemplateApiV1WorkflowTemplatesDuplicatePost({
                body: { template_id: id, workflow_name: title },
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.data) {
                router.push(`/workflow/${response.data.id}`);
            }
        } catch (error) {
            logger.error(`Error creating workflow from template: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full gap-2"
                    onClick={handleUseTemplate}
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating...' : (
                        <>Use Template <ArrowRight className="w-4 h-4" /></>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

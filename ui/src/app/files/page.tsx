"use client";

import { ExternalLink, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

import DocumentList from "./DocumentList";
import DocumentUpload from "./DocumentUpload";
import { FAQEditor } from "./FAQEditor";

const TABS = [
    { id: "documents", label: "Documents" },
    { id: "faq", label: "FAQ / Fact Sheet" },
];

export default function FilesPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [refreshKey, setRefreshKey] = useState(0);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("documents");

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const handleUploadSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setIsUploadOpen(false);
    };

    if (loading || !user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
                <p className="text-muted-foreground">
                    Manage documents and FAQs your voice agents can reference during calls.{" "}
                    <a href="https://docs.lynq.com/voice-agent/knowledge-base" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                        Learn more <ExternalLink className="h-3 w-3" />
                    </a>
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-border mb-6">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "documents" && (
                <>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Your Documents</CardTitle>
                                    <CardDescription>
                                        Documents shared across all agents in your organization
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setIsUploadOpen(true)}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Document
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DocumentList refreshTrigger={refreshKey} />
                        </CardContent>
                    </Card>

                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload Document</DialogTitle>
                                <DialogDescription>
                                    Upload a PDF or document file to add to your knowledge base
                                </DialogDescription>
                            </DialogHeader>
                            <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {activeTab === "faq" && <FAQEditor />}
        </div>
    );
}

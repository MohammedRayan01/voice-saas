'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Package } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export interface PackMeta {
    pack_id: string;
    name: string;
    description: string;
    icon: string;
    features: string[];
    wizard_schema: unknown[];
}

interface InstalledPack {
    pack_id: string;
    pack_name: string;
    config: Record<string, unknown>;
    installed: boolean;
}

interface PackGalleryProps {
    onInstall: (pack: PackMeta) => void;
    onManage: (pack: PackMeta, installed: InstalledPack) => void;
}

export default function PackGallery({ onInstall, onManage }: PackGalleryProps) {
    const { user, getAccessToken } = useAuth();
    const hasFetched = useRef(false);

    const [packs, setPacks] = useState<PackMeta[]>([]);
    const [installed, setInstalled] = useState<InstalledPack | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || hasFetched.current) return;
        hasFetched.current = true;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [packsRes, installedRes] = await Promise.all([
                fetch(`${API}/api/v1/whatsapp/packs`, { headers }),
                fetch(`${API}/api/v1/whatsapp/packs/installed`, { headers }),
            ]);

            if (packsRes.ok) {
                const data = await packsRes.json();
                setPacks(data.packs ?? []);
            }
            if (installedRes.ok) {
                const data = await installedRes.json();
                setInstalled(data.installed ? data : null);
            }
        } catch (err) {
            logger.error('PackGallery fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (packs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No industry packs available yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {installed && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            {installed.pack_name} is active
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            Your AI concierge is configured and ready to handle guest inquiries.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packs.map((pack) => {
                    const isInstalled = installed?.pack_id === pack.pack_id;
                    return (
                        <Card key={pack.pack_id} className={isInstalled ? 'border-green-300 dark:border-green-700' : ''}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{pack.icon}</span>
                                        <div>
                                            <CardTitle className="text-base">{pack.name}</CardTitle>
                                            {isInstalled && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-400 dark:text-green-400 mt-1">
                                                    Active
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <CardDescription className="text-sm mt-1">{pack.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="pb-3">
                                <ul className="space-y-1">
                                    {pack.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                {isInstalled && installed ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => onManage(pack, installed)}
                                    >
                                        Manage / Reconfigure
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="w-full"
                                        onClick={() => onInstall(pack)}
                                    >
                                        Install Pack
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

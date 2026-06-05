'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const TABS = [
    { label: 'Inbox', href: '/whatsapp/inbox' },
    { label: 'Contacts', href: '/whatsapp/contacts' },
    { label: 'Pipelines', href: '/whatsapp/pipelines' },
    { label: 'Broadcasts', href: '/whatsapp/broadcasts' },
    { label: 'Automations', href: '/whatsapp/automations' },
    { label: 'Settings', href: '/whatsapp/settings' },
];

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-[calc(100vh-53px)]">
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b px-4 bg-background shrink-0">
                {TABS.map((tab) => {
                    const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                                active
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}

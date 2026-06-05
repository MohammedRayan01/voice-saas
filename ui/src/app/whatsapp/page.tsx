'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsAppPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/whatsapp/inbox');
    }, [router]);
    return null;
}

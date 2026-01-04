'use client';

import { ReactNode, useEffect, useState } from 'react';
import { RegistrationProvider } from './context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SignupLayoutProps {
    children: ReactNode;
}

export default function SignupLayout({ children }: SignupLayoutProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // 이미 세션이 있으면 프로필이 있는지 확인
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (profile) {
                    // 프로필까지 있으면 홈으로
                    router.replace('/');
                    return;
                }
            }
            setLoading(false);
        }
        checkSession();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <RegistrationProvider>
            <div className="min-h-screen bg-white flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        {children}
                    </div>
                </div>
            </div>
        </RegistrationProvider>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });

            if (authError) throw authError;
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Google 로그인 중 오류가 발생했습니다.');
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-slide-in text-center">
            {/* Logo area */}
            <div className="mb-12 flex flex-col items-center">
                <Image src="/logo.svg" alt="타점국어" width={160} height={40} className="h-10 w-auto mb-3" priority />
                <p className="text-gray-500">국어의 결정적 한 타</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-8">
                로그인
            </h2>

            {/* Google Login Button */}
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3 mb-4"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        style={{ fill: '#4285F4' }}
                    />
                    <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        style={{ fill: '#34A853' }}
                    />
                    <path
                        fill="currentColor"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                        style={{ fill: '#FBBC05' }}
                    />
                    <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        style={{ fill: '#EA4335' }}
                    />
                </svg>
                {isLoading ? '연결 중...' : 'Google로 시작하기'}
            </button>

            {error && (
                <p className="text-red-500 text-sm mt-4">{error}</p>
            )}

            <p className="text-xs text-gray-400 mt-12 px-8">
                로그인 시 타점국어의 <span className="underline cursor-pointer text-gray-500">이용약관</span> 및 <span className="underline cursor-pointer text-gray-500">개인정보처리방침</span>에 동의하게 됩니다.
            </p>
        </div>
    );
}

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
        <div className="animate-slide-in">
            <div className="glass-panel rounded-3xl p-10 flex flex-col items-center">
                {/* Logo area */}
                <div className="mb-12 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full" />
                        <Image
                            src="/logo.svg"
                            alt="타점국어"
                            width={180}
                            height={45}
                            className="h-12 w-auto relative z-10"
                            priority
                        />
                    </div>
                    <p className="text-gray-500 font-medium tracking-tight">국어의 결정적 한 타</p>
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="group relative w-full py-4 bg-white border border-gray-100 text-gray-700 font-bold rounded-2xl hover:border-primary/30 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-premium flex items-center justify-center gap-3 mb-6 active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
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
                    <span className="relative z-10">{isLoading ? '연결 중...' : 'Google로 시작하기'}</span>
                </button>

                {error && (
                    <p className="text-red-500 text-sm animate-fade-in">{error}</p>
                )}

                <p className="text-[11px] text-gray-400 mt-10 px-4 leading-relaxed">
                    로그인 시 타점국어의 <span className="underline cursor-pointer text-gray-400 hover:text-gray-600">이용약관</span> 및 <br />
                    <span className="underline cursor-pointer text-gray-400 hover:text-gray-600">개인정보처리방침</span>에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
}

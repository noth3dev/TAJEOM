'use client';

import { useRouter } from 'next/navigation';
import { useRegistration } from './context';

export default function RoleSelectionPage() {
    const router = useRouter();
    const { data, updateData } = useRegistration();

    const handleSelect = (role: 'student' | 'parent') => {
        updateData({ role });
        router.push('/signup/info');
    };

    return (
        <div className="animate-slide-in">
            {/* Progress */}
            <div className="mb-8">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '20%' }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">1 / {data.role === 'student' ? '5' : '3'}</p>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-gray-900 mb-2">
                반가워요!
            </h1>
            <p className="text-gray-500 mb-10">
                어떤 목적으로 서비스를 이용하시나요?
            </p>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={() => handleSelect('student')}
                    className={`p-6 rounded-[24px] border-2 text-left transition-all group ${data.role === 'student' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-orange-200'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${data.role === 'student' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500'
                            }`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">저는 학생입니다</p>
                            <p className="text-xs text-gray-400 mt-0.5">학습 콘텐츠와 리포트를 확인합니다</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => handleSelect('parent')}
                    className={`p-6 rounded-[24px] border-2 text-left transition-all group ${data.role === 'parent' ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-orange-200'
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${data.role === 'parent' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500'
                            }`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">저는 학부모입니다</p>
                            <p className="text-xs text-gray-400 mt-0.5">자녀의 학습 현황을 연동하여 확인합니다</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Login Link */}
            <p className="mt-10 text-center text-sm text-gray-400 font-medium">
                이미 계정이 있으신가요?{' '}
                <button
                    onClick={() => router.push('/login')}
                    className="text-orange-500 font-bold hover:underline underline-offset-4"
                >
                    로그인
                </button>
            </p>
        </div>
    );
}

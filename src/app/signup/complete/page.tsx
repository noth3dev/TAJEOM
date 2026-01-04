'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context';
import { supabase } from '@/lib/supabase';

export default function CompletePage() {
    const router = useRouter();
    const { data, resetData } = useRegistration();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    const isStudent = data.role === 'student';

    const handleSubmit = async () => {
        const isValid = isStudent
            ? (data.name && data.school && data.grade !== null && data.phoneNumber)
            : (data.name && data.phoneNumber);

        if (!isValid) {
            setError('모든 정보를 입력해 주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session?.user) throw new Error('로그인 세션이 만료되었습니다.');

            const profileData: any = {
                id: session.user.id,
                name: data.name,
                phone_number: data.phoneNumber,
                role: data.role,
                is_approved: data.role === 'parent' // 학부모는 즉시 승인, 학생은 대기
            };

            if (isStudent && data.school) {
                profileData.school_name = data.school.name;
                profileData.school_type = data.school.type;
                profileData.birth_year = data.birthYear;
            }

            const { error: insertError } = await supabase.from('users').insert(profileData);

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('이미 프로필이 등록된 계정입니다.');
                }
                throw insertError;
            }

            setIsComplete(true);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || '가입 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (isStudent) {
            router.push('/signup/grade');
        } else {
            router.push('/signup/info');
        }
    };

    const handleFinish = () => {
        resetData();
        router.push('/');
    };

    if (isComplete) {
        return (
            <div className="animate-slide-in text-center py-10">
                <div className="w-24 h-24 mx-auto mb-8 bg-orange-500 rounded-[32px] flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-2">가입 완료!</h1>
                <p className="text-gray-500 mb-10 font-medium">
                    {data.name} {isStudent ? '학생' : '학부모'}님, 환영합니다! 🎉
                </p>

                <button onClick={handleFinish} className="btn-primary">시작하기</button>
            </div>
        );
    }

    const stepTotal = isStudent ? '5' : '3';
    const progressText = `${isStudent ? '5' : '3'} / ${stepTotal}`;

    return (
        <div className="animate-slide-in">
            {/* Back button */}
            <button onClick={handleBack} className="mb-6 text-gray-400 hover:text-gray-600 transition-colors">
                ← 이전
            </button>

            {/* Progress */}
            <div className="mb-8">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '100%' }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">{progressText}</p>
            </div>

            <h1 className="text-3xl font-black text-gray-900 mb-2">정보를 확인하세요</h1>
            <p className="text-gray-500 mb-10">입력하신 정보가 모두 맞나요?</p>

            <div className="space-y-4 mb-10">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">이름</div>
                    <div className="font-bold text-gray-900">{data.name}</div>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">전화번호</div>
                    <div className="font-bold text-gray-900">{data.phoneNumber}</div>
                </div>

                {isStudent && (
                    <>
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">학교</div>
                            <div className="font-bold text-gray-900">
                                {data.school?.name} ({data.school?.type})
                            </div>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">학년 / 출생년도</div>
                            <div className="font-bold text-gray-900">{data.grade}학년 ({data.birthYear}년생)</div>
                        </div>
                    </>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary"
            >
                {isLoading ? '가입 처리 중...' : '가입 완료하기'}
            </button>
        </div>
    );
}

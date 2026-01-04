'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface Notice {
    id: string;
    title: string;
    content: string;
    created_at: string;
    author_id: string;
    users?: {
        name: string;
    };
}

export default function NoticeDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [notice, setNotice] = useState<Notice | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        async function fetchNotice() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    setUserRole(userData?.role || 'student');
                }

                const { data, error } = await supabase
                    .from('notices')
                    .select(`
                        *,
                        users:author_id (name)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setNotice(data);
            } catch (error) {
                console.error('Error fetching notice:', error);
                router.push('/notices');
            } finally {
                setLoading(false);
            }
        }

        if (id) fetchNotice();
    }, [id, router]);

    const handleDelete = async () => {
        if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase.from('notices').delete().eq('id', id);
            if (error) throw error;
            router.push('/notices');
        } catch (error: any) {
            alert('삭제 중 오류 발생: ' + error.message);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="py-20 flex justify-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!notice) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0 py-6 md:py-0 mb-20">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors group mb-4"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    목록으로 돌아가기
                </button>

                {/* Main Content Card */}
                <div className="bg-white rounded-[40px] shadow-sm border border-gray-50 overflow-hidden">
                    <div className="p-8 md:p-12 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">Official</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(notice.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight mb-8">
                            {notice.title}
                        </h1>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                                    {(notice.users?.name || '관')[0]}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 underline decoration-orange-500/30 decoration-2 underline-offset-4 uppercase tracking-widest mb-1">작성자</p>
                                    <p className="text-sm font-black text-gray-900">{notice.users?.name || '관리자'}</p>
                                </div>
                            </div>
                            {(userRole === 'teacher' || userRole === 'admin') && (
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 text-red-400 hover:text-red-600 font-bold text-xs transition-colors"
                                >
                                    삭제하기
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-8 md:p-12 pt-12 md:pt-16 pb-20">
                        <div className="prose prose-orange max-w-none">
                            <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                                {notice.content}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="bg-gray-900 rounded-[32px] p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h4 className="text-lg font-bold mb-1">공지사항에 대해 궁금한 점이 있으신가요?</h4>
                        <p className="text-gray-400 text-xs font-medium">학원 대표 번호 또는 채널톡으로 문의해주시면 친절하게 안내해드립니다.</p>
                    </div>
                    <button
                        disabled
                        className="px-6 py-3 bg-gray-800 text-gray-500 font-black rounded-2xl text-sm cursor-not-allowed shadow-lg"
                    >
                        문의하기 (준비중)
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}

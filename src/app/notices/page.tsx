'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New notice states
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
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

            const { data } = await supabase
                .from('notices')
                .select(`
                    *,
                    users:author_id (name)
                `)
                .order('created_at', { ascending: false });

            setNotices(data || []);
        } catch (error) {
            console.error('Error fetching notices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateNotice = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { error } = await supabase.from('notices').insert({
                title: newTitle,
                content: newContent,
                author_id: session.user.id
            });

            if (error) throw error;

            alert('공지사항이 등록되었습니다.');
            setShowCreateModal(false);
            setNewTitle('');
            setNewContent('');
            fetchData();
        } catch (error: any) {
            alert('등록 중 오류 발생: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-0 py-6 md:py-0 mb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">학원 공지사항</h1>
                        <p className="text-sm text-gray-500 mt-1">타점국어의 새로운 소식을 전해드립니다</p>
                    </div>
                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            공지 작성
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notices.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {notices.map((notice) => (
                            <Link
                                href={`/notices/${notice.id}`}
                                key={notice.id}
                                className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-50 hover:shadow-md hover:border-orange-100 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded-lg uppercase tracking-wider">Notice</span>
                                        <span className="text-xs font-bold text-gray-400">
                                            {new Date(notice.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                        {notice.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-1">
                                        {notice.content}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs font-bold text-gray-400 mb-0.5">작성자</p>
                                        <p className="text-sm font-bold text-gray-900">{notice.users?.name || '관리자'}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white rounded-[40px] border border-gray-50">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <p className="text-gray-400 font-bold">등록된 공지사항이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 sm:p-0">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl relative animate-scale-in">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">공지사항 작성</h2>
                            <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">공지 제목</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="공지 제목을 입력하세요"
                                    className="w-full px-6 py-4.5 bg-gray-50 border border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-orange-200 focus:ring-4 focus:ring-orange-500/5 transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">공지 내용</label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="내용을 입력하세요"
                                    rows={8}
                                    className="w-full px-6 py-4.5 bg-gray-50 border border-transparent rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:border-orange-200 focus:ring-4 focus:ring-orange-500/5 transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-4.5 bg-gray-50 text-gray-400 font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95 text-sm"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleCreateNotice}
                                    disabled={saving}
                                    className="flex-[2] py-4.5 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 text-sm"
                                >
                                    {saving ? '등록 중...' : '공지 게시하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </DashboardLayout>
    );
}

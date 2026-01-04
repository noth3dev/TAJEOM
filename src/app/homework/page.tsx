'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface Homework {
    id: string;
    title: string;
    description: string;
    fileName: string;
    uploaded_at: string;
    classes: { name: string };
    downloads_count?: number;
}

export default function HomeworkPage() {
    const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    setLoading(false);
                    return;
                }

                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                setUserRole(userData?.role || 'student');

                let query = supabase
                    .from('homework')
                    .select('*, classes(name)')
                    .order('created_at', { ascending: false });

                if (userData?.role === 'student') {
                    const { data: enrolledData } = await supabase
                        .from('class_students')
                        .select('class_id')
                        .eq('student_id', session.user.id);
                    const classIds = enrolledData?.map(e => e.class_id) || [];
                    query = query.in('class_id', classIds);
                }

                const { data } = await query;

                if (data) {
                    const updated = await Promise.all(data.map(async (hw) => {
                        const { count } = await supabase
                            .from('homework_downloads')
                            .select('*', { count: 'exact', head: true })
                            .eq('homework_id', hw.id);
                        return { ...hw, fileName: hw.file_name, uploaded_at: hw.created_at, downloads_count: count || 0 };
                    }));
                    setHomeworkList(updated as any[]);
                }
            } catch (error) {
                console.error('Error fetching homework data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-0 py-6 md:py-0">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PDF 자료실</h1>
                        <p className="text-sm text-gray-500 mt-1">학습에 필요한 PDF 자료를 내려받으세요</p>
                    </div>
                </div>

                {/* Upload Area for Teachers (Minimalist version) */}
                {userRole === 'teacher' && (
                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-10 text-center hover:border-orange-200 transition-colors cursor-pointer group">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500 transition-colors">
                            <svg className="w-6 h-6 text-orange-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-gray-900">새로운 자료 업로드</p>
                        <p className="text-xs text-gray-400 mt-1">PDF 파일을 여기에 끌어다 놓으세요</p>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : homeworkList.length > 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden divide-y divide-gray-50">
                        {homeworkList.map((hw) => (
                            <div key={hw.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-50 transition-colors">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 uppercase tracking-tight">{hw.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{hw.classes?.name}</span>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                            <span className="text-xs text-gray-400 font-medium">{hw.fileName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:block text-right">
                                        <p className="text-xs font-bold text-gray-900">{new Date(hw.uploaded_at).toLocaleDateString()}</p>
                                        <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">{hw.downloads_count} DOWNLOADS</p>
                                    </div>
                                    <button className="w-12 h-12 bg-gray-50 text-gray-400 hover:bg-orange-500 hover:text-white rounded-2xl flex items-center justify-center transition-all">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white rounded-3xl border border-gray-50">
                        <p className="text-gray-400 font-bold">등록된 학습 자료가 없습니다.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

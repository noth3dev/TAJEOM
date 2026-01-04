'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_date: string;
    file_url?: string;
    classes: { name: string };
    class_id: string;
}

interface Submission {
    id: string;
    student_id: string;
    student: { name: string; school_name: string };
    file_url?: string;
    content?: string;
    submitted_at: string;
    grade?: number;
    feedback?: string;
}

export default function AssignmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [mySubmission, setMySubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Teacher grade/feedback form
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [gradeInput, setGradeInput] = useState<number>(0);
    const [feedbackInput, setFeedbackInput] = useState('');

    // Student upload form
    const [uploading, setUploading] = useState(false);
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            setUserId(session.user.id);

            const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
            const role = userData?.role || 'student';
            setUserRole(role);

            // Fetch Assignment
            const { data: asgn, error: aError } = await supabase
                .from('assignments')
                .select('*, classes(name)')
                .eq('id', params.id)
                .single();

            if (aError) throw aError;
            setAssignment(asgn as any);

            // Role based data fetch
            if (role === 'teacher' || role === 'admin') {
                const { data: subs } = await supabase
                    .from('submissions')
                    .select('*, student:users!submissions_student_id_fkey(name, school_name)')
                    .eq('assignment_id', params.id);
                setSubmissions(subs as any[] || []);
            } else if (role === 'student') {
                const { data: sub } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('assignment_id', params.id)
                    .eq('student_id', session.user.id)
                    .maybeSingle();
                setMySubmission(sub as any);
            } else if (role === 'parent') {
                const { data: links } = await supabase.from('parent_student_links').select('student_id').eq('parent_id', session.user.id);
                if (links && links.length > 0) {
                    const studentIds = links.map(l => l.student_id);
                    const { data: subs } = await supabase
                        .from('submissions')
                        .select('*, student:users!submissions_student_id_fkey(name, school_name)')
                        .eq('assignment_id', params.id)
                        .in('student_id', studentIds);
                    // Use submissions state to store children's submissions if multiple, or mySubmission for single
                    setSubmissions(subs as any[] || []);
                }
            }

        } catch (error) {
            console.error('Error:', error);
            router.push('/assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (params.id) fetchData(); }, [params.id]);

    const handleFileUpload = async (file: File, bucket: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${bucket}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;
    };

    const handleSubmitAssignment = async () => {
        if (!submissionFile || !userId) return;
        setUploading(true);
        try {
            // Ensure submissions bucket exists or use public folder
            const url = await handleFileUpload(submissionFile, 'assignments'); // Using same bucket for simplicity

            const { error } = await supabase.from('submissions').upsert({
                assignment_id: params.id,
                student_id: userId,
                file_url: url,
                submitted_at: new Date().toISOString()
            });

            if (error) throw error;
            alert('과제가 제출되었습니다!');
            fetchData();
        } catch (error: any) {
            console.error('Detailed Submission Error:', error);
            alert('제출 실패: ' + (error.message || '상세 로그를 확인해 주세요.'));
        } finally {
            setUploading(false);
            setSubmissionFile(null);
        }
    };

    const handleSaveEvaluation = async () => {
        if (!selectedSubId) return;
        try {
            const { error } = await supabase
                .from('submissions')
                .update({ grade: gradeInput, feedback: feedbackInput })
                .eq('id', selectedSubId);

            if (error) throw error;
            alert('채점이 완료되었습니다.');
            setSelectedSubId(null);
            fetchData();
        } catch (error: any) {
            alert('저장 실패: ' + error.message);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        </DashboardLayout>
    );

    if (!assignment) return null;

    return (
        <DashboardLayout>
            <div className="space-y-8 px-4 md:px-0 mb-20 animate-fade-in">
                {/* Back Link */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    목록으로 돌아가기
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Assignment Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[48px] p-8 md:p-12 shadow-sm border border-gray-50 overflow-hidden relative">
                            <div className="relative z-10">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 inline-block">{assignment.classes?.name}</span>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 tracking-tight line-height-[1.1]">{assignment.title}</h1>
                                <p className="text-gray-500 font-medium text-lg leading-relaxed whitespace-pre-wrap mb-10">{assignment.description || '상세 설명이 없습니다.'}</p>

                                <div className="flex flex-wrap items-center gap-4 pt-8 border-t border-gray-50">
                                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 rounded-2xl">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm font-bold text-gray-600">마감: {new Date(assignment.due_date).toLocaleDateString()}</span>
                                    </div>
                                    {assignment.file_url && (
                                        <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            과제 PDF 다운로드
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32" />
                        </div>

                        {/* Student Part: Submission Status/Form */}
                        {(userRole === 'student') && (
                            <div className="bg-white rounded-[48px] p-8 md:p-12 shadow-sm border border-gray-50">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-gray-900">나의 제출 현황</h2>
                                    {mySubmission && <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase">제출완료</span>}
                                </div>

                                {mySubmission ? (
                                    <div className="space-y-6">
                                        <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <span className="text-xs font-bold text-gray-400">제출일: {new Date(mySubmission.submitted_at).toLocaleString()}</span>
                                                <a href={mySubmission.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2 rounded-xl">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    제출 파일 확인
                                                </a>
                                            </div>
                                            {mySubmission.grade !== undefined && (
                                                <div className="pt-8 border-t border-gray-200/50 space-y-4">
                                                    <div className="flex items-end gap-2">
                                                        <span className="text-5xl font-black text-indigo-600">{mySubmission.grade}</span>
                                                        <span className="text-sm font-bold text-gray-400 mb-2">/ 100</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed font-medium bg-white p-6 rounded-2xl border border-gray-100 italic">
                                                        "{mySubmission.feedback || '선생님의 피드백이 준비 중입니다.'}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 text-center py-4">
                                        <div className="w-full max-w-sm mx-auto">
                                            <label className="w-full h-48 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-200 transition-all group">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                                                    <svg className="w-8 h-8 text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                </div>
                                                <span className="text-sm font-bold text-gray-400 group-hover:text-gray-600">{submissionFile ? submissionFile.name : '파일을 선택하거나 드래그하세요'}</span>
                                                <span className="text-[10px] text-gray-300 mt-2 font-medium">PDF 파일만 업로드 가능합니다</span>
                                                <input type="file" className="hidden" accept=".pdf" onChange={e => setSubmissionFile(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                        <button
                                            onClick={handleSubmitAssignment}
                                            disabled={!submissionFile || uploading}
                                            className="w-full max-w-sm py-5 bg-gray-900 text-white font-black rounded-[24px] hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-200"
                                        >
                                            {uploading ? '제출 중...' : '과제 제출하기'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Parent Part: Submissions List */}
                        {userRole === 'parent' && (
                            <div className="bg-white rounded-[48px] p-8 md:p-12 shadow-sm border border-gray-50">
                                <h2 className="text-2xl font-black text-gray-900 mb-8">자녀 제출 현황</h2>
                                {submissions.length > 0 ? (
                                    <div className="space-y-4">
                                        {submissions.map(sub => (
                                            <div key={sub.id} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-black text-gray-900">{sub.student?.name}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${sub.grade !== undefined ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            {sub.grade !== undefined ? `${sub.grade}점` : '미채점'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400">제출일: {new Date(sub.submitted_at).toLocaleDateString()}</span>
                                                </div>
                                                {sub.file_url && (
                                                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2 rounded-xl">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        PDF
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-gray-400 font-bold">
                                        아직 제출된 과제가 없습니다.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Submissions List (Teacher Only) */}
                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[48px] p-8 shadow-sm border border-gray-50 flex flex-col h-[600px]">
                                <h3 className="text-xl font-black mb-6 flex items-center justify-between">
                                    제출 목록
                                    <span className="text-xs bg-gray-50 px-3 py-1 rounded-full text-gray-400">{submissions.length}명</span>
                                </h3>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {submissions.map(sub => (
                                        <div
                                            key={sub.id}
                                            onClick={() => {
                                                setSelectedSubId(sub.id);
                                                setGradeInput(sub.grade || 0);
                                                setFeedbackInput(sub.feedback || '');
                                            }}
                                            className={`p-4 rounded-3xl border transition-all cursor-pointer ${selectedSubId === sub.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-50 hover:border-gray-100 bg-gray-50/30'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-gray-900">{sub.student?.name}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${sub.grade !== undefined ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {sub.grade !== undefined ? `${sub.grade}점` : '미채점'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mb-2">{sub.student?.school_name}</p>
                                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                                                <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                                                {sub.file_url && <span className="text-indigo-500 font-black">PDF</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {submissions.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                            <p className="text-sm font-bold text-gray-300">아직 제출한 학생이 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evaluation Form */}
                            {selectedSubId && (
                                <div className="bg-indigo-600 text-white rounded-[40px] p-8 shadow-xl shadow-indigo-100 animate-scale-in">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-black tracking-tight">과제 채점</h3>
                                        <button onClick={() => setSelectedSubId(null)} className="text-white/50 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 block">점수 (0-100)</label>
                                            <input
                                                type="number"
                                                className="w-full px-5 py-3 bg-white/10 rounded-2xl font-bold border border-white/10 focus:bg-white/20 outline-none transition-all text-sm"
                                                value={gradeInput}
                                                onChange={e => setGradeInput(parseInt(e.target.value))}
                                                min="0" max="100"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 block">피드백</label>
                                            <textarea
                                                className="w-full px-5 py-3 bg-white/10 rounded-2xl font-bold border border-white/10 focus:bg-white/20 outline-none transition-all text-sm resize-none"
                                                rows={3}
                                                value={feedbackInput}
                                                onChange={e => setFeedbackInput(e.target.value)}
                                                placeholder="학생에게 남길 말을 적어주세요"
                                            />
                                        </div>
                                        <a href={submissions.find(s => s.id === selectedSubId)?.file_url} target="_blank" rel="noopener noreferrer" className="w-full block py-3 bg-white/10 text-white text-center rounded-2xl text-xs font-bold hover:bg-white/20 mb-2">제출 파일 보기</a>
                                        <button onClick={handleSaveEvaluation} className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-gray-100 transition-all shadow-lg text-xs uppercase tracking-widest">채점 완료</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f1f1; border-radius: 10px; }
            `}</style>
        </DashboardLayout>
    );
}

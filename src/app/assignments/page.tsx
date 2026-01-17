'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { PDFDocument } from 'pdf-lib';

interface ClassItem {
    id: string;
    name: string;
    day_of_week: number;
    start_time: string;
}

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_date: string;
    status: 'active' | 'closed' | 'draft';
    file_url?: string;
    class_id: string;
    classes: { name: string };
    submissions_count?: number;
    total_students?: number;
    my_submission?: any;
}

export default function AssignmentsPage() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [myClasses, setMyClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // New Assignment Form
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        class_id: '',
        due_date: '',
        file: null as File | null,
        page_range: ''
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rangeError, setRangeError] = useState<string | null>(null);

    const DAYS_TEXT = ['일', '월', '화', '수', '목', '금', '토'];

    // 다음 수업일 계산 헬퍼
    const getNextClassDate = (dayOfWeek: number) => {
        const now = new Date();
        const resultDate = new Date();
        const currentDay = now.getDay();

        // 차이 계산 (0-6)
        let diff = dayOfWeek - currentDay;
        if (diff <= 0) diff += 7; // 오늘이 수업일이면 다음 주 수업일로

        resultDate.setDate(now.getDate() + diff);
        return resultDate.toISOString().split('T')[0];
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }
            setUserId(session.user.id);

            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            const role = userData?.role || 'student';
            setUserRole(role);

            // Fetch Assignments
            let query = supabase
                .from('assignments')
                .select('*, classes(name)')
                .order('due_date', { ascending: true });

            if (role === 'student') {
                const { data: enrolledData } = await supabase.from('class_students').select('class_id').eq('student_id', session.user.id);
                const classIds = enrolledData?.map(e => e.class_id) || [];
                query = query.in('class_id', classIds);
            } else if (role === 'teacher') {
                query = query.eq('created_by', session.user.id);
            } else if (role === 'parent') {
                const { data: links } = await supabase.from('parent_student_links').select('student_id').eq('parent_id', session.user.id);
                if (links && links.length > 0) {
                    const studentIds = links.map(l => l.student_id);
                    const { data: enrolledData } = await supabase.from('class_students').select('class_id').in('student_id', studentIds);
                    const classIds = enrolledData?.map(e => e.class_id) || [];
                    query = query.in('class_id', classIds);
                } else {
                    setAssignments([]);
                    setLoading(false);
                    return;
                }
            }

            const { data } = await query;

            if (data) {
                const updated = await Promise.all(data.map(async (asgn) => {
                    const { count: subCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('assignment_id', asgn.id);
                    const { count: totalCount } = await supabase.from('class_students').select('*', { count: 'exact', head: true }).eq('class_id', asgn.class_id);

                    let mySub = null;
                    if (role === 'student') {
                        const { data: subData } = await supabase.from('submissions').select('*').eq('assignment_id', asgn.id).eq('student_id', session.user.id).maybeSingle();
                        mySub = subData;
                    } else if (role === 'parent') {
                        // Find if any child submitted this
                        const { data: links } = await supabase.from('parent_student_links').select('student_id').eq('parent_id', session.user.id);
                        if (links) {
                            const studentIds = links.map(l => l.student_id);
                            const { data: subData } = await supabase.from('submissions').select('*').eq('assignment_id', asgn.id).in('student_id', studentIds).maybeSingle();
                            mySub = subData;
                        }
                    }
                    return { ...asgn, submissions_count: subCount || 0, total_students: totalCount || 0, my_submission: mySub };
                }));
                setAssignments(updated as any[]);
            }

            // Fetch Teacher's Classes for Modal (Sorted by schedule)
            if (role === 'teacher' || role === 'admin') {
                const { data: classesData } = await supabase
                    .from('classes')
                    .select('id, name, day_of_week, start_time')
                    .order('day_of_week', { ascending: true })
                    .order('start_time', { ascending: true });
                if (classesData) setMyClasses(classesData);
            }

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        let isCancelled = false;
        let timeoutId: NodeJS.Timeout;

        const updatePreview = async () => {
            if (newAssignment.file) {
                try {
                    const processedFile = await processPdfRange(newAssignment.file, newAssignment.page_range);
                    if (isCancelled) return;

                    const url = URL.createObjectURL(processedFile);
                    setPreviewUrl(url);
                    setRangeError(null);
                } catch (error: any) {
                    if (isCancelled) return;
                    console.error('Preview processing error:', error);
                    const url = URL.createObjectURL(newAssignment.file);
                    setPreviewUrl(url);
                    setRangeError(error.message);
                }
            } else {
                setPreviewUrl(null);
            }
        };

        timeoutId = setTimeout(updatePreview, 400);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [newAssignment.file, newAssignment.page_range]);

    // Cleanup object URLs when previewUrl changes to avoid memory leaks
    useEffect(() => {
        const currentUrl = previewUrl;
        return () => {
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [previewUrl]);

    const handleFileUpload = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `assignments/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('assignments')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('assignments')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const processPdfRange = async (file: File, range: string): Promise<File> => {
        if (!range.trim()) return file;

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        const newPdfDoc = await PDFDocument.create();

        // Range parsing logic (e.g., "1, 3-5, 7-")
        const parts = range.split(',').map(p => p.trim());
        const pagesToInclude: number[] = [];

        for (const part of parts) {
            if (part.includes('-')) {
                const [startStr, endStr] = part.split('-');
                const start = parseInt(startStr) || 1;
                const end = endStr ? parseInt(endStr) : totalPages;

                if (start > totalPages) {
                    throw new Error(`시작 페이지(${start})가 전체 페이지(${totalPages})보다 큽니다.`);
                }
                if (endStr && start > end) {
                    throw new Error(`시작 페이지(${start})가 끝 페이지(${end})보다 큽니다.`);
                }
                if (start < 1) {
                    throw new Error(`시작 페이지는 1 이상이어야 합니다.`);
                }

                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) pagesToInclude.push(i - 1);
                }
            } else {
                const page = parseInt(part);
                if (isNaN(page)) continue;
                if (page > totalPages) {
                    throw new Error(`지정한 페이지(${page})가 전체 페이지(${totalPages})를 초과합니다.`);
                }
                if (page < 1) {
                    throw new Error(`페이지 번호는 1 이상이어야 합니다.`);
                }
                pagesToInclude.push(page - 1);
            }
        }

        if (pagesToInclude.length === 0) return file;

        // Remove duplicates and sort
        const uniquePages = Array.from(new Set(pagesToInclude)).sort((a, b) => a - b);

        const copiedPages = await newPdfDoc.copyPages(pdfDoc, uniquePages);
        copiedPages.forEach(page => newPdfDoc.addPage(page));

        const pdfBytes = await newPdfDoc.save();
        return new File([pdfBytes], file.name, { type: 'application/pdf' });
    };

    const handleAddAssignment = async () => {
        if (!newAssignment.title || !newAssignment.class_id) {
            alert('필수 정보를 입력해 주세요.');
            return;
        }

        setIsUploading(true);
        try {
            let fileUrl = '';
            if (newAssignment.file) {
                const processedFile = await processPdfRange(newAssignment.file, newAssignment.page_range);
                fileUrl = await handleFileUpload(processedFile);
            }

            // 마감 기한 자동 설정 로직
            let finalDueDate = newAssignment.due_date;
            if (!finalDueDate) {
                const targetClass = myClasses.find(c => c.id === newAssignment.class_id);
                if (targetClass) {
                    finalDueDate = getNextClassDate(targetClass.day_of_week);
                }
            }

            const { error } = await supabase.from('assignments').insert({
                title: newAssignment.title,
                description: newAssignment.description,
                class_id: newAssignment.class_id,
                due_date: finalDueDate ? new Date(finalDueDate).toISOString() : null,
                file_url: fileUrl,
                created_by: userId,
                status: 'active'
            });

            if (error) throw error;

            alert('과제가 성공적으로 출제되었습니다.');
            setShowAddModal(false);
            setNewAssignment({ title: '', description: '', class_id: '', due_date: '', file: null, page_range: '' });
            fetchData();
        } catch (error: any) {
            alert('과제 출제 실패: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusBadge = (asgn: Assignment) => {
        if (userRole === 'student' || userRole === 'parent') {
            return asgn.my_submission
                ? <span className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] rounded-full font-black uppercase tracking-wider">제출완료</span>
                : <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] rounded-full font-black uppercase tracking-wider">미제출</span>;
        }

        switch (asgn.status) {
            case 'active':
                return <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] rounded-full font-black uppercase tracking-wider">진행중</span>;
            case 'closed':
                return <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] rounded-full font-black uppercase tracking-wider">마감</span>;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-0 mb-20">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">과제 관리</h1>
                        <p className="text-xs md:text-sm text-gray-400 mt-1 font-medium">
                            {userRole === 'teacher' || userRole === 'admin'
                                ? '학생들에게 과제를 출제하고 현황을 관리하세요'
                                : userRole === 'parent'
                                    ? '자녀에게 배정된 과제와 제출 현황을 확인하세요'
                                    : '배정된 과제를 확인하고 PDF를 확인하세요'}
                        </p>
                    </div>
                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-black transition-all flex items-center gap-2 shrink-0 active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            새 과제 내기
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : assignments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {assignments.map((asgn) => (
                            <div
                                key={asgn.id}
                                onClick={() => router.push(`/assignments/${asgn.id}`)}
                                className="glass-panel rounded-[32px] p-6 md:p-8 hover:border-primary/30 transition-all group overflow-hidden relative cursor-pointer hover:shadow-glow"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            {getStatusBadge(asgn)}
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{asgn.classes?.name}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-primary transition-colors truncate tracking-tight">
                                            {asgn.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 font-medium line-clamp-1 mb-5">
                                            {asgn.description || '과제 설명이 없습니다.'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                마감: {new Date(asgn.due_date).toLocaleDateString()}
                                            </div>
                                            {asgn.file_url && (
                                                <a
                                                    href={asgn.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-3 py-1.5 bg-indigo-50 rounded-lg"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1.5m1.5 0H13m-4 4h1.5m1.5 0H13m-4 4h1.5m1.5 0H13" /></svg>
                                                    과제 PDF 보기
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-24 md:w-32 h-2 bg-gray-50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${(asgn.submissions_count! / asgn.total_students!) * 100 || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-black text-gray-400">
                                                    {asgn.submissions_count}/{asgn.total_students}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">제출 현황</p>
                                        </div>
                                        <button className="w-12 h-12 glass-panel bg-white/50 text-gray-300 group-hover:bg-primary group-hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:shadow-glow border-0">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                                {/* Decorative line */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-100 group-hover:bg-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center glass-panel rounded-[40px] border-0">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <p className="text-gray-400 font-bold">현재 진행 중인 과제가 없습니다.</p>
                    </div>
                )}

                {/* Add Assignment Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-gray-900/60 backdrop-blur-md">
                        <div className="bg-white w-full max-w-6xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-[40px] md:rounded-[56px] shadow-2xl relative overflow-hidden animate-scale-in flex flex-col md:flex-row">

                            {/* Left Section: PDF Preview */}
                            <div className="w-full md:w-[55%] bg-gray-50 border-r border-gray-100 flex flex-col relative overflow-hidden min-h-[300px] md:min-h-0">
                                <div className="absolute top-8 left-8 z-10">
                                    <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest">PDF Preview</span>
                                    </div>
                                </div>

                                {previewUrl ? (
                                    <iframe
                                        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="w-full h-full border-none"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-24 h-24 bg-white rounded-[32px] shadow-sm flex items-center justify-center mb-6 border border-gray-50">
                                            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">파일을 선택해주세요</h3>
                                        <p className="text-sm text-gray-400 max-w-[240px]">왼쪽에서 PDF 파일을 업로드하면 미리보기가 나타납니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Section: Form */}
                            <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white custom-scrollbar">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">신규 과제 출제</h2>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block px-1">과제 제목</label>
                                        <input
                                            type="text"
                                            placeholder="과제 이름을 입력하세요"
                                            className="w-full px-6 py-4.5 bg-gray-50 rounded-[24px] font-bold focus:bg-white border-2 border-transparent focus:border-indigo-500/10 outline-none transition-all text-sm"
                                            value={newAssignment.title}
                                            onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">대상 수업</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                            {myClasses.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setNewAssignment({ ...newAssignment, class_id: c.id })}
                                                    className={`p-4 rounded-[24px] border-2 transition-all flex flex-col gap-1.5 ${newAssignment.class_id === c.id
                                                        ? 'border-indigo-500 bg-indigo-50/30'
                                                        : 'border-gray-50 bg-gray-50/50 hover:border-gray-100'
                                                        }`}
                                                >
                                                    <span className={`text-[9px] font-black w-fit px-2 py-0.5 rounded-full ${newAssignment.class_id === c.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        {DAYS_TEXT[c.day_of_week]} {c.start_time?.slice(0, 5) || '--:--'}
                                                    </span>
                                                    <span className={`text-[11px] font-bold truncate ${newAssignment.class_id === c.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                        {c.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block px-1">마감 기한</label>
                                            <input
                                                type="date"
                                                className="w-full px-6 py-4.5 bg-gray-50 rounded-[24px] font-bold focus:bg-white border-2 border-transparent focus:border-indigo-500/10 outline-none transition-all text-sm"
                                                value={newAssignment.due_date}
                                                onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block px-1">과제 PDF 파일</label>
                                            <label className="w-full px-6 py-4.5 bg-gray-50 rounded-[24px] font-bold flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all group/btn">
                                                <span className="text-xs text-gray-400 truncate max-w-[120px]">{newAssignment.file ? newAssignment.file.name : 'PDF 선택'}</span>
                                                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm group-hover/btn:scale-110 transition-transform">
                                                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                <input type="file" accept=".pdf" className="hidden" onChange={e => setNewAssignment({ ...newAssignment, file: e.target.files?.[0] || null })} />
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2.5 px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">페이지 범위 (옵션)</label>
                                            <div className="group relative">
                                                <svg className="w-3.5 h-3.5 text-gray-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                    예: 1, 3-5, 7- (1p, 3~5p, 7p부터 전원)
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="예: 1, 3-5, 7-"
                                            className={`w-full px-6 py-4.5 bg-gray-50 rounded-[24px] font-bold focus:bg-white border-2 outline-none transition-all text-sm ${rangeError ? 'border-red-500/20 text-red-500' : 'border-transparent focus:border-indigo-500/10 text-gray-900'}`}
                                            value={newAssignment.page_range}
                                            onChange={e => setNewAssignment({ ...newAssignment, page_range: e.target.value })}
                                        />
                                        {rangeError && (
                                            <p className="mt-2 ml-2 text-[11px] font-bold text-red-500 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                {rangeError}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block px-1">과제 설명 (선택)</label>
                                        <textarea
                                            placeholder="학생들에게 전달할 안내사항을 입력하세요"
                                            rows={2}
                                            className="w-full px-6 py-4.5 bg-gray-50 rounded-[24px] font-bold focus:bg-white border-2 border-transparent focus:border-indigo-500/10 outline-none transition-all text-sm resize-none"
                                            value={newAssignment.description}
                                            onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleAddAssignment}
                                            disabled={isUploading}
                                            className="w-full py-5 bg-gray-900 text-white font-black rounded-[28px] shadow-xl shadow-gray-200 hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest"
                                        >
                                            {isUploading ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    처리 중...
                                                </div>
                                            ) : '과제 출제 완료'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface StudentGrade {
    id: string;
    student_id: string;
    subject: string;
    score: number;
    notes: string;
    exam_date: string;
    created_at: string;
    users?: {
        name: string;
        school_name: string;
    };
    classes?: {
        name: string;
    };
}

interface GroupedEvaluation {
    id: string;
    classId: string;
    className: string;
    testName: string;
    examDate: string;
    students: StudentGrade[];
}

export default function ReportsPage() {
    const [grades, setGrades] = useState<StudentGrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [expandedEvaluations, setExpandedEvaluations] = useState<string[]>([]);

    // Teacher input states
    const [showInput, setShowInput] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [testName, setTestName] = useState('');
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

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

            let query = supabase
                .from('grades')
                .select('*, users:users!student_id(name, school_name), classes(name)')
                .order('exam_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (role === 'student') {
                query = query.eq('student_id', session.user.id);
            } else if (role === 'parent') {
                // 부모는 연결된 자녀의 성적만 조회
                const { data: links } = await supabase
                    .from('parent_student_links')
                    .select('student_id')
                    .eq('parent_id', session.user.id);

                if (links && links.length > 0) {
                    query = query.in('student_id', links.map(l => l.student_id));
                } else {
                    setGrades([]);
                    setLoading(false);
                    return;
                }
            } else if (role === 'teacher') {
                // 선생님은 자신이 수업하는 반의 성적만 (혹은 자신이 생성한 것)
                // 여기서는 복잡성 줄이기 위해 teacher_id 필터링 대신 전체를 가져오되 RLS로 제어된다고 가정하거나
                // 명시적으로 필터링 추가 가능
            }

            const { data: gradesData, error } = await query;
            if (error) console.error('Grades fetch error:', error);
            console.log('Fetched Grades:', gradesData);
            setGrades((gradesData as any[]) || []);

            if (role === 'teacher' || role === 'admin') {
                let classesQuery = supabase.from('classes').select('id, name, subject');
                if (role === 'teacher') {
                    classesQuery = classesQuery.eq('teacher_id', session.user.id);
                }
                const { data: classesData } = await classesQuery;
                setClasses(classesData || []);
            }
        } catch (error) {
            console.error('Error fetching reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchClassStudents(selectedClass);
        }
    }, [selectedClass]);

    const fetchClassStudents = async (classId: string) => {
        const { data } = await supabase
            .from('class_students')
            .select('student_id, users(name, school_name)')
            .eq('class_id', classId);

        if (data) {
            setStudents(data.map((item: any) => ({
                id: item.student_id,
                name: item.users.name,
                school: item.users.school_name,
                score: '',
                notTaken: false
            })));
        }
    };

    const handleSave = async () => {
        if (!selectedClass || !testName) {
            alert('수업과 평가 명칭을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            const gradeEntries = students
                .filter(s => !s.notTaken && s.score !== '')
                .map(s => ({
                    student_id: s.id,
                    class_id: selectedClass,
                    subject: classes.find(c => c.id === selectedClass)?.subject || '국어',
                    score: parseInt(s.score),
                    notes: testName,
                    exam_date: testDate,
                    created_by: userId
                }));

            // 성적 저장
            if (gradeEntries.length > 0) {
                const { error: gError } = await supabase.from('grades').insert(gradeEntries);
                if (gError) throw gError;
            }

            alert('성적이 성공적으로 기록되었습니다.');
            setShowInput(false);
            setStudents([]);
            setSelectedClass('');
            setTestName('');
            fetchData();
        } catch (error: any) {
            console.error('Save error:', error);
            alert('저장 중 오류 발생: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-orange-600';
        if (score >= 80) return 'text-orange-400';
        if (score >= 70) return 'text-gray-900';
        return 'text-gray-400';
    };

    const getGroupedEvaluations = (): GroupedEvaluation[] => {
        const grouped = grades.reduce((acc: Record<string, GroupedEvaluation>, grade) => {
            const key = `${grade.class_id}-${grade.notes}-${grade.exam_date}`;
            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    classId: grade.class_id,
                    className: grade.classes?.name || '기타 수업',
                    testName: grade.notes || '정기 고사',
                    examDate: grade.exam_date,
                    students: []
                };
            }
            acc[key].students.push(grade);
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
    };

    const toggleEvaluation = (id: string) => {
        setExpandedEvaluations(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-0 py-6 md:py-0 mb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">성적표 리포트</h1>
                        <p className="text-sm text-gray-500 mt-1">정기 테스트 및 과제 평가 결과입니다</p>
                    </div>
                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <button
                            onClick={() => setShowInput(!showInput)}
                            className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {showInput ? '기록 취소' : '성적 입력'}
                        </button>
                    )}
                </div>

                {showInput && (
                    <div className="bg-white rounded-[40px] p-8 md:p-10 border border-orange-100 shadow-xl shadow-orange-500/5 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">수업 선택</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm border-transparent focus:bg-white focus:border-gray-100 outline-none transition-all"
                                >
                                    <option value="">수업을 선택하세요</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">평가 명칭 (예: 주간 테스트)</label>
                                <input
                                    type="text"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="예: 1월 1주차 정기평가"
                                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm border-transparent focus:bg-white focus:border-gray-100 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">시행 날짜</label>
                                <input
                                    type="date"
                                    value={testDate}
                                    onChange={(e) => setTestDate(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm border-transparent focus:bg-white focus:border-gray-100 outline-none transition-all"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedClass}
                                    className="w-full py-3.5 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 text-sm"
                                >
                                    {saving ? '저장 중...' : '일괄 저장하기'}
                                </button>
                            </div>
                        </div>

                        {selectedClass && students.length > 0 ? (
                            <div className="space-y-4">
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 pb-2 border-b border-gray-50">
                                    <div className="col-span-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">학생 성명</div>
                                    <div className="col-span-4 text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">점수 (0-100) / 상태</div>
                                    <div className="col-span-4 text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">미응시 체크</div>
                                </div>
                                <div className="space-y-3">
                                    {students.map((s, idx) => (
                                        <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 md:p-6 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-orange-200 transition-colors group">
                                            <div className="md:col-span-4 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-bold text-gray-400 border border-gray-100 group-hover:text-orange-500 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{s.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{s.school}</span>
                                                </div>
                                            </div>
                                            <div className="md:col-span-4">
                                                <input
                                                    type="number"
                                                    value={s.score}
                                                    disabled={s.notTaken}
                                                    onChange={(e) => {
                                                        const newList = [...students];
                                                        newList[idx].score = e.target.value;
                                                        setStudents(newList);
                                                    }}
                                                    placeholder={!s.notTaken ? "점수 입력" : "-"}
                                                    className={`w-full px-4 py-2.5 rounded-xl font-bold text-center outline-none transition-all ${!s.notTaken
                                                        ? "bg-white border border-gray-100 focus:ring-2 focus:ring-orange-500/20"
                                                        : "bg-gray-100 border-transparent text-gray-400 cursor-not-allowed"
                                                        }`}
                                                />
                                            </div>
                                            <div className="md:col-span-4 flex justify-end">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <span className={`text-[11px] font-black transition-colors ${s.notTaken ? 'text-red-500' : 'text-gray-300'}`}>미응시</span>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="hidden peer"
                                                            checked={s.notTaken}
                                                            onChange={() => {
                                                                const newList = [...students];
                                                                newList[idx].notTaken = !newList[idx].notTaken;
                                                                if (newList[idx].notTaken) {
                                                                    newList[idx].score = '';
                                                                }
                                                                setStudents(newList);
                                                            }}
                                                        />
                                                        <div className="w-12 h-6 bg-gray-100 rounded-full peer-checked:bg-red-50 transition-all border border-gray-100 peer-checked:border-red-100"></div>
                                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 peer-checked:bg-red-500 shadow-sm border border-gray-100 peer-checked:border-transparent"></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : selectedClass ? (
                            <div className="py-20 text-center">
                                <p className="text-gray-400 font-bold">해당 수업에 등록된 학생이 없습니다.</p>
                            </div>
                        ) : null}
                    </div>
                )}

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : grades.length > 0 ? (
                    userRole === 'teacher' || userRole === 'admin' ? (
                        /* Teacher/Admin View: Grouped by Evaluation */
                        <div className="space-y-4">
                            {getGroupedEvaluations().map((evaluation) => {
                                const isExpanded = expandedEvaluations.includes(evaluation.id);
                                const avgScore = Math.round(evaluation.students.reduce((acc, s) => acc + s.score, 0) / evaluation.students.length);

                                return (
                                    <div key={evaluation.id} className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm transition-all hover:border-orange-100">
                                        <div
                                            onClick={() => toggleEvaluation(evaluation.id)}
                                            className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shrink-0">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{evaluation.className}</span>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                        <span className="text-[10px] font-bold text-gray-400">{evaluation.examDate}</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-gray-900">{evaluation.testName}</h3>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">응시 인원</p>
                                                    <p className="text-lg font-black text-gray-900">{evaluation.students.length}명</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">평균 점수</p>
                                                    <p className="text-lg font-black text-orange-500">{avgScore}<span className="text-xs ml-0.5">/100</span></p>
                                                </div>
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-6 md:px-8 pb-8 border-t border-gray-50 animate-fade-in">
                                                <div className="grid grid-cols-12 gap-4 py-4 px-4 text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50">
                                                    <div className="col-span-1 text-center">NO</div>
                                                    <div className="col-span-5">학생명 / 학교</div>
                                                    <div className="col-span-3 text-center">취득 점수</div>
                                                    <div className="col-span-3 text-right">상태</div>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {evaluation.students.sort((a, b) => (a.users?.name || '').localeCompare(b.users?.name || '')).map((grade, idx) => (
                                                        <div key={grade.id} className="grid grid-cols-12 gap-4 py-4 px-4 items-center">
                                                            <div className="col-span-1 text-center text-xs font-bold text-gray-400">{idx + 1}</div>
                                                            <div className="col-span-5 flex flex-col">
                                                                <span className="text-sm font-black text-gray-900">{grade.users?.name}</span>
                                                                <span className="text-[10px] text-gray-400 font-medium">{grade.users?.school_name}</span>
                                                            </div>
                                                            <div className="col-span-3 text-center">
                                                                <span className={`text-lg font-black ${getScoreColor(grade.score)}`}>{grade.score}</span>
                                                                <span className="text-[10px] font-bold text-gray-400 ml-0.5">/100</span>
                                                            </div>
                                                            <div className="col-span-3 text-right">
                                                                <span className="px-3 py-1 bg-gray-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Done</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Student/Parent View: List Layout */
                        <div className="space-y-3">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-8 pb-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                <div className="col-span-2">날짜</div>
                                <div className="col-span-2">과목 / 학생</div>
                                <div className="col-span-5">평가 명칭</div>
                                <div className="col-span-3 text-right">취득 점수</div>
                            </div>
                            {grades.map((grade) => (
                                <div key={grade.id} className="bg-white rounded-3xl p-6 md:px-8 md:py-6 border border-gray-100 shadow-sm hover:border-orange-100 hover:shadow-md transition-all group flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-2 flex items-center gap-3 w-full">
                                        <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 md:hidden">시행일:</span>
                                        <span className="text-xs font-bold text-gray-500 font-mono">
                                            {new Date(grade.exam_date || grade.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col w-full">
                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">{grade.subject}</span>
                                        <span className="text-sm font-black text-gray-900">
                                            {userRole === 'parent' ? grade.users?.name : '내 성적'}
                                        </span>
                                    </div>

                                    <div className="md:col-span-5 w-full">
                                        <h3 className="text-base font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase">
                                            {grade.notes || '정기 고사'}
                                        </h3>
                                    </div>

                                    <div className="md:col-span-3 text-right w-full flex justify-between md:block">
                                        <span className="text-gray-400 text-xs font-bold md:hidden">취득 점수</span>
                                        <div>
                                            <span className={`text-2xl font-black ${getScoreColor(grade.score)} tracking-tighter`}>{grade.score}</span>
                                            <span className="text-[10px] font-bold text-gray-400 ml-1 tracking-widest">/100</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="py-20 text-center bg-white rounded-[40px] border border-gray-50">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-gray-400 font-bold">등록된 성적 리포트가 없습니다.</p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </DashboardLayout>
    );
}

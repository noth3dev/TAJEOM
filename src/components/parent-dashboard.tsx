'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ParentDashboardProps {
    userName: string;
}

export default function ParentDashboard({ userName }: ParentDashboardProps) {
    const [stats, setStats] = useState([
        { label: '자녀 출석', value: '-', change: '', positive: true },
        { label: '최근 과제', value: '-', change: '', positive: true },
        { label: '평균 성적', value: '-', change: '', positive: true },
    ]);
    const [children, setChildren] = useState<any[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [latestNotice, setLatestNotice] = useState<{ title: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Calculate dynamic stats
    const calculateStats = async (childrenIds: string[]) => {
        if (childrenIds.length === 0) return { assignmentRate: '-', avgScore: '-' };

        try {
            // 1. Calculate Assignment Completion Rate (Last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Get assignments for these students' classes
            // For simplicity, we get submissions counts vs assignments count.
            // A precise way: Get all enrolled classes -> Get all active assignments -> Check submissions.
            // Approximated way: Get all submissions / (Assignments count) -- hard to do without joining.
            // Let's look at grades first as it's easier.

            // 2. Calculate Average Score
            const { data: gradesData } = await supabase
                .from('grades')
                .select('score')
                .in('student_id', childrenIds);

            let avgScore = '-';
            if (gradesData && gradesData.length > 0) {
                const total = gradesData.reduce((sum, g) => sum + (g.score || 0), 0);
                avgScore = Math.round(total / gradesData.length) + '점';
            }

            // 3. Assignment Rate (This is tricky with simple queries, let's try a best effort)
            // Fetch all submissions for these students in last 30 days
            const { count: submissionCount } = await supabase
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .in('student_id', childrenIds)
                .gte('submitted_at', thirtyDaysAgo.toISOString());

            // We'll just show the submission count for now or a static-ish "Good" if > 0.
            // To do % properly, we need total assignments count.
            // Let's try to get total assignments for their classes.
            // It requires: class_students -> classes -> assignments
            let assignmentRate = '0%';
            if (childrenIds.length > 0) {
                // Get one student's classes to approximate (or all)
                const { data: enrollment } = await supabase.from('class_students').select('class_id').in('student_id', childrenIds);
                const classIds = enrollment?.map(e => e.class_id) || [];

                if (classIds.length > 0) {
                    const { count: totalAssignments } = await supabase
                        .from('assignments')
                        .select('*', { count: 'exact', head: true })
                        .in('class_id', classIds)
                        .gte('created_at', thirtyDaysAgo.toISOString());

                    if (totalAssignments && totalAssignments > 0) {
                        const rate = Math.round(((submissionCount || 0) / totalAssignments) * 100);
                        assignmentRate = `${rate > 100 ? 100 : rate}%`;
                    }
                }
            }

            return { assignmentRate, avgScore };

        } catch (e) {
            console.error('Stats Calc Error', e);
            return { assignmentRate: '-', avgScore: '-' };
        }
    };

    const fetchChildren = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // 연동된 자녀 목록 조회
            const { data: linkedChildren } = await supabase
                .from('parent_student_links')
                .select('student_id, users!parent_student_links_student_id_fkey(name, school_name)')
                .eq('parent_id', session.user.id);

            if (linkedChildren) {
                const today = new Date().toISOString().split('T')[0];

                // 자녀들의 오늘 출석 정보 가져오기
                const studentIds = linkedChildren.map(l => l.student_id);
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('student_id, check_in_time, check_out_time, status')
                    .in('student_id', studentIds)
                    .eq('date', today);

                const childrenWithAttendance = linkedChildren.map(link => {
                    const studentAttendance = attendanceData?.find(a => a.student_id === link.student_id);
                    let attendanceStatus = '미등원';
                    let timeInfo = '';

                    if (studentAttendance) {
                        if (studentAttendance.check_out_time) {
                            attendanceStatus = '하원 완료';
                            timeInfo = new Date(studentAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } else if (studentAttendance.check_in_time) {
                            attendanceStatus = '등원 중';
                            timeInfo = new Date(studentAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                    }

                    return {
                        id: link.student_id,
                        name: (link.users as any).name,
                        school: (link.users as any).school_name,
                        attendanceStatus,
                        timeInfo
                    };
                });

                setChildren(childrenWithAttendance);

                // 통계 업데이트
                if (childrenWithAttendance.length > 0) {
                    const firstChild = childrenWithAttendance[0];
                    const studentIds = childrenWithAttendance.map(c => c.id);
                    const dynamicStats = await calculateStats(studentIds);

                    setStats([
                        { label: '오늘 상태', value: firstChild.attendanceStatus, change: firstChild.timeInfo, positive: true },
                        { label: '최근 과제', value: dynamicStats.assignmentRate, change: '지난 30일', positive: true },
                        { label: '평균 성적', value: dynamicStats.avgScore, change: '전체 평균', positive: true },
                    ]);
                }
                // 3. 최신 공지사항 가져오기
                const { data: noticeData } = await supabase
                    .from('notices')
                    .select('title')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (noticeData) setLatestNotice(noticeData);
            }
        } catch (error) {
            console.error('Error fetching parent dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChildren();
    }, []);

    const handleLinkChild = async () => {
        if (verificationCode.length !== 6) {
            alert('6자리 코드를 입력해주세요.');
            return;
        }

        setLinking(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // 1. 코드 유효성 확인
            const { data: codeData, error: codeError } = await supabase
                .from('connection_codes')
                .select('student_id')
                .eq('code', verificationCode.toUpperCase())
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (codeError || !codeData) {
                alert('유효하지 않거나 만료된 코드입니다.');
                setLinking(false);
                return;
            }

            // 2. 링크 생성
            const { error: linkError } = await supabase
                .from('parent_student_links')
                .insert({
                    parent_id: session.user.id,
                    student_id: codeData.student_id
                });

            if (linkError) {
                if (linkError.code === '23505') {
                    alert('이미 연동된 학생입니다.');
                } else {
                    alert('연동 처리 중 오류가 발생했습니다.');
                }
            } else {
                alert('자녀 계정 연동이 완료되었습니다.');
                setVerificationCode('');
                setShowAddForm(false);
                fetchChildren();
            }
        } catch (error) {
            console.error('Error linking child:', error);
        } finally {
            setLinking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-12 py-10">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    반갑습니다, {userName} 학부모님
                </h1>
                <p className="text-gray-400 font-medium">자녀의 학습 현황을 확인하실 수 있습니다</p>
            </div>

            <div className="max-w-2xl mx-auto w-full">
                {/* Notice Banner */}
                <Link
                    href="/notices"
                    className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.99]"
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="overflow-hidden">
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block mb-0.5">학원 공지</span>
                            <span className="text-sm md:text-base text-gray-600 font-bold truncate block">
                                {latestNotice ? latestNotice.title : '공지사항이 없습니다.'}
                            </span>
                        </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {children.length === 0 || showAddForm ? (
                <div className="flex flex-col items-center justify-center max-w-md mx-auto animate-fade-in">
                    <div className="w-full bg-white rounded-[40px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-gray-100 text-center relative">
                        {children.length > 0 && (
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-orange-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {children.length === 0 ? '연동된 자녀가 없습니다' : '새로운 자녀 연동'}
                        </h2>
                        <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
                            자녀의 프로필 페이지에서 생성된<br />학부모 연동 코드를 입력해주세요.
                        </p>

                        <div className="space-y-4">
                            <input
                                type="text"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                placeholder="연동 코드 6자리 입력"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center text-2xl font-black tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                                autoFocus
                            />
                            <button
                                onClick={handleLinkChild}
                                disabled={linking}
                                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {linking ? '연동 중...' : '자녀 계정 연결하기'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-fade-in">
                    {children.map((child) => (
                        <div key={child.id} className="bg-white rounded-[40px] p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-gray-100">
                            <div className="flex items-center gap-5 mb-10 pb-10 border-b border-gray-50">
                                <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 font-bold text-xl">
                                    {child.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                                    <p className="text-gray-400 font-medium text-sm">{child.school}</p>
                                </div>
                                <div className="text-right">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${child.attendanceStatus === '등원 중' ? 'bg-orange-50 text-orange-600' :
                                        child.attendanceStatus === '하원 완료' ? 'bg-gray-900 text-white' :
                                            'bg-gray-50 text-gray-400'
                                        }`}>
                                        {child.attendanceStatus === '등원 중' && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />}
                                        {child.attendanceStatus}
                                    </div>
                                    {child.timeInfo && (
                                        <p className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-wider">{child.timeInfo}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="text-center group">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-gray-600 transition-colors">{stat.label}</p>
                                        <p className="text-xl font-black text-gray-900 group-hover:text-orange-500 transition-colors">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Add another child button */}
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="h-full min-h-[280px] border-2 border-dashed border-gray-100 rounded-[40px] flex flex-col items-center justify-center text-gray-300 hover:border-orange-200 hover:text-orange-300 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <span className="font-bold">추가 자녀 연동하기</span>
                    </button>
                </div>
            )}
        </div>
    );
}

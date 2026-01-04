'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface TeacherDashboardProps {
    userName: string;
}

export default function TeacherDashboard({ userName }: TeacherDashboardProps) {
    const router = useRouter();
    const [stats, setStats] = useState([
        { label: '전체 학생', value: '0', change: '', positive: true },
        { label: '오늘 출석', value: '0', change: '0%', positive: true },
        { label: '미제출 과제', value: '0', change: '', positive: false },
        { label: '활성 수업', value: '0', change: '', positive: true },
    ]);
    const [recentActivities, setRecentActivities] = useState<{ time: string, content: string }[]>([]);
    const [latestNotice, setLatestNotice] = useState<{ title: string } | null>(null);
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [showWifiModal, setShowWifiModal] = useState(false);
    const [wifiSsid, setWifiSsid] = useState('');
    const [currentIp, setCurrentIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [wifiLoading, setWifiLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const today = new Date().toISOString().split('T')[0];

                // 1. 전체 데이터 병렬 패칭
                const [
                    { count: studentCount },
                    { count: attendanceCount },
                    { count: assignmentCount },
                    { count: classCount },
                    { data: recentSubmissions },
                    { data: noticeData },
                    { data: pendingData }
                ] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
                    supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                    supabase.from('classes').select('*', { count: 'exact', head: true }),
                    supabase.from('submissions').select('submitted_at, users(name), assignments(title)').order('submitted_at', { ascending: false }).limit(4),
                    supabase.from('notices').select('title').order('created_at', { ascending: false }).limit(1).maybeSingle(),
                    supabase.from('users').select('*').eq('role', 'student').eq('is_approved', false)
                ]);

                const attendanceRate = studentCount && studentCount > 0
                    ? Math.round(((attendanceCount || 0) / studentCount) * 100)
                    : 0;

                setStats([
                    { label: '전체 학생', value: String(studentCount || 0), change: '', positive: true },
                    { label: '오늘 출석', value: String(attendanceCount || 0), change: `${attendanceRate}%`, positive: true },
                    { label: '미제출 과제', value: String(assignmentCount || 0), change: '', positive: false },
                    { label: '활성 수업', value: String(classCount || 0), change: '', positive: true },
                ]);

                if (noticeData) setLatestNotice(noticeData);
                if (pendingData) setPendingStudents(pendingData);

                if (recentSubmissions && recentSubmissions.length > 0) {
                    setRecentActivities(recentSubmissions.map((s: any) => ({
                        time: new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        content: `${s.users?.name || '익명'} 학생이 ${s.assignments?.title || '과제'}를 제출했습니다.`
                    })));
                } else {
                    setRecentActivities([{ time: '방금 전', content: '최근 활동이 없습니다.' }]);
                }
            } catch (error) {
                console.error('Error fetching teacher dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        fetchWifiSettings();
    }, []);

    const fetchWifiSettings = async () => {
        const { data } = await supabase.from('wifi_settings').select('ssid, ip_address').maybeSingle();
        if (data) {
            setWifiSsid(data.ssid || '');
            setCurrentIp(data.ip_address);
        }
    };

    const handleSetWifi = async () => {
        setWifiLoading(true);
        try {
            // 현재 공용 IP 가져오기
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const ip = data.ip;

            const { data: existing } = await supabase.from('wifi_settings').select('id').maybeSingle();

            let result;
            if (existing) {
                result = await supabase.from('wifi_settings').update({
                    ssid: wifiSsid,
                    ip_address: ip,
                    updated_at: new Date().toISOString()
                }).eq('id', existing.id);
            } else {
                result = await supabase.from('wifi_settings').insert({
                    ssid: wifiSsid,
                    ip_address: ip
                });
            }

            if (result.error) throw result.error;

            setCurrentIp(ip);
            setShowWifiModal(false);
            alert('학원 와이파이 설정이 완료되었습니다.');
        } catch (error) {
            console.error('Wifi setting error:', error);
            alert('와이파이 설정 중 오류가 발생했습니다.');
        } finally {
            setWifiLoading(false);
        }
    };

    const handleApprove = async (studentId: string) => {
        const { error } = await supabase
            .from('users')
            .update({ is_approved: true })
            .eq('id', studentId);

        if (!error) {
            setPendingStudents(prev => prev.filter(s => s.id !== studentId));
            alert('승인이 완료되었습니다.');
        } else {
            alert('승인 중 오류가 발생했습니다.');
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
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">안녕하세요, {userName} 선생님!</h1>
                <p className="text-sm md:text-base text-gray-500 mt-1">오늘의 학원 현황을 확인하세요</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
                    >
                        <p className="text-[11px] md:text-sm text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl md:text-3xl font-black text-gray-900">{stat.value}</span>
                            {stat.change && (
                                <span className={`text-[10px] md:text-sm font-bold ${stat.positive ? 'text-orange-500' : 'text-gray-400'}`}>
                                    {stat.change}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Approvals (Conditionally rendered) */}
                {pendingStudents.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            <h2 className="text-lg font-semibold text-gray-900">가입 승인 대기 명단</h2>
                            <span className="ml-2 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-bold rounded-full">
                                {pendingStudents.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingStudents.map((student) => (
                                <div key={student.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900">{student.name}</p>
                                        <p className="text-xs text-gray-400">{student.school_name} · {student.birth_year % 100}년생</p>
                                    </div>
                                    <button
                                        onClick={() => handleApprove(student.id)}
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        승인
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activities */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
                    <div className="space-y-4">
                        {recentActivities.map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="w-2 h-2 rounded-full mt-2 bg-orange-500" />
                                <div className="flex-1">
                                    <p className="text-gray-900">{activity.content}</p>
                                    <p className="text-sm text-gray-400">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Academy Notice & Quick Actions */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Notice Banner */}
                    <Link
                        href="/notices"
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between group cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-bold text-orange-500 mb-0.5">학원 공지</div>
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                    {latestNotice ? latestNotice.title : '등록된 공지사항이 없습니다.'}
                                </div>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                            <button
                                onClick={() => router.push('/classes')}
                                className="p-4 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100"
                            >
                                <div className="w-10 h-10 bg-gray-900 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-lg shadow-gray-200">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <p className="text-[13px] md:text-sm font-bold text-gray-900">새 수업 만들기</p>
                            </button>
                            <button
                                onClick={() => router.push('/assignments')}
                                className="p-4 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100"
                            >
                                <div className="w-10 h-10 bg-gray-900 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-lg shadow-gray-200">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-[13px] md:text-sm font-bold text-gray-900">과제 출제</p>
                            </button>
                            <button
                                onClick={() => router.push('/attendance')}
                                className="p-4 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100"
                            >
                                <div className="w-10 h-10 bg-gray-900 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-lg shadow-gray-200">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-[13px] md:text-sm font-bold text-gray-900">출석 체크</p>
                            </button>
                            <button
                                onClick={() => setShowWifiModal(true)}
                                className="p-4 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100"
                            >
                                <div className="w-10 h-10 bg-gray-900 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-lg shadow-gray-200">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.141c5.857-5.858 15.355-5.858 21.212 0" />
                                    </svg>
                                </div>
                                <p className="text-[13px] md:text-sm font-bold text-gray-900">와이파이 설정</p>
                            </button>
                            <button
                                onClick={() => router.push('/assignments')}
                                className="p-4 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100"
                            >
                                <div className="w-10 h-10 bg-gray-900 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-3 transition-colors shadow-lg shadow-gray-200">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="text-[13px] md:text-sm font-bold text-gray-900">PDF 업로드</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Wifi Settings Modal */}
            {
                showWifiModal && (
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 sm:p-0">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowWifiModal(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-scale-in">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-gray-900">학원 와이파이 설정</h2>
                                <button onClick={() => setShowWifiModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">WIFI 이름 (SSID)</label>
                                    <input
                                        type="text"
                                        value={wifiSsid}
                                        onChange={(e) => setWifiSsid(e.target.value)}
                                        placeholder="예: TAJEOM_FREE_WIFI"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                                    />
                                </div>

                                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                                    <p className="text-[11px] text-orange-600 font-bold mb-2 flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        현재 네트워크 정보
                                    </p>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500">현재 이 기기가 접속 중인 IP를 학원 와이파이 주소로 등록합니다.</p>
                                        <p className="text-sm font-black text-gray-900">{currentIp || 'IP 감지 중...'}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSetWifi}
                                    disabled={wifiLoading}
                                    className="w-full py-4.5 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {wifiLoading ? '설정 중...' : '현재 네트워크로 설정하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

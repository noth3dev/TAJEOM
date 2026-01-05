'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface StudentDashboardProps {
    userName: string;
}

export default function StudentDashboard({ userName }: StudentDashboardProps) {
    const [seconds, setSeconds] = useState(0);
    const [isAttendanceChecked, setIsAttendanceChecked] = useState(false);
    const [isCheckOutDone, setIsCheckOutDone] = useState(false);
    const [stats, setStats] = useState([
        { label: '출석 횟수', value: '0회', change: '0', positive: true },
        { label: '완료 과제', value: '0개', change: '0%', positive: true },
        { label: '평균 점수', value: '0점', change: '0', positive: true },
        { label: '참여 수업', value: '0개', change: '0', positive: true },
    ]);
    const [latestNotice, setLatestNotice] = useState<{ title: string } | null>(null);
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [isWifiConnected, setIsWifiConnected] = useState(false);
    const [isWifiLoading, setIsWifiLoading] = useState(true);
    const [currentIp, setCurrentIp] = useState('');
    const [academySsid, setAcademySsid] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    setLoading(false);
                    return;
                }

                const userId = session.user.id;

                // 0. 승인 상태 먼저 확인
                const { data: userData } = await supabase
                    .from('users')
                    .select('is_approved')
                    .eq('id', userId)
                    .single();

                setIsApproved(userData?.is_approved || false);

                // 승인되지 않은 경우 더 이상의 데이터 로딩 중단
                if (!userData?.is_approved) {
                    setLoading(false);
                    return;
                }

                const today = new Date().toISOString().split('T')[0];

                // 1. 오늘의 출결 정보 (타이머 시작점)
                const { data: todayAttendance } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('student_id', userId)
                    .eq('date', today)
                    .maybeSingle();

                if (todayAttendance?.check_in_time) {
                    setIsAttendanceChecked(true);

                    if (todayAttendance.check_out_time) {
                        setIsCheckOutDone(true);
                        // 하원까지 했으면 하원 시각 기준으로 고정
                        const checkIn = new Date(todayAttendance.check_in_time).getTime();
                        const checkOut = new Date(todayAttendance.check_out_time).getTime();
                        setSeconds(Math.floor((checkOut - checkIn) / 1000));
                    } else {
                        const checkIn = new Date(todayAttendance.check_in_time).getTime();
                        const now = new Date().getTime();
                        setSeconds(Math.floor((now - checkIn) / 1000));
                    }
                }

                // 2. 전체 통계 집계
                const [{ count: attendanceCount }, { count: submissionCount }, { data: gradesData }, { data: classData }] = await Promise.all([
                    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', userId).eq('status', 'present'),
                    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', userId),
                    supabase.from('grades').select('score').eq('student_id', userId),
                    supabase.from('class_students').select('classes(day_of_week, start_time, name)').eq('student_id', userId)
                ]);

                const avgScore = gradesData && gradesData.length > 0
                    ? Math.round(gradesData.reduce((acc, curr) => acc + curr.score, 0) / gradesData.length)
                    : 0;

                // 다음 수업 계산
                let nextClassText = '없음';
                if (classData && classData.length > 0) {
                    const classes = classData.map((c: any) => c.classes).filter(Boolean);
                    if (classes.length > 0) {
                        const now = new Date();
                        const currentDay = now.getDay();
                        const currentTime = now.getHours() * 60 + now.getMinutes();

                        const sorted = [...classes].sort((a: any, b: any) => {
                            const aStart = a.day_of_week * 1440 + parseInt(a.start_time.split(':')[0]) * 60 + parseInt(a.start_time.split(':')[1]);
                            const bStart = b.day_of_week * 1440 + parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]);

                            const nowMinutes = currentDay * 1440 + currentTime;

                            let aDiff = aStart - nowMinutes;
                            if (aDiff <= 0) aDiff += 7 * 1440;

                            let bDiff = bStart - nowMinutes;
                            if (bDiff <= 0) bDiff += 7 * 1440;

                            return aDiff - bDiff;
                        });

                        const next = sorted[0];
                        if (next) {
                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                            nextClassText = `${days[next.day_of_week]} ${next.start_time.slice(0, 5)}`;
                        }
                    }
                }

                setStats([
                    { label: '출석 횟수', value: `${attendanceCount || 0}회`, change: '', positive: true },
                    { label: '완료 과제', value: `${submissionCount || 0}개`, change: '', positive: true },
                    { label: '평균 점수', value: `${avgScore}점`, change: '', positive: true },
                    { label: '다음 수업', value: nextClassText, change: '', positive: true },
                ]);

                // 3. 최신 공지사항 가져오기
                const { data: noticeData } = await supabase
                    .from('notices')
                    .select('title')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (noticeData) setLatestNotice(noticeData);

            } catch (error) {
                console.error('Error fetching student dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        checkWifi();
    }, []);

    const checkWifi = async () => {
        setIsWifiLoading(true);
        try {
            const [{ data: wifiSetting }, ipRes] = await Promise.all([
                supabase.from('wifi_settings').select('ssid, ip_address').maybeSingle(),
                fetch('https://api.ipify.org?format=json').then(res => res.json())
            ]);

            setCurrentIp(ipRes.ip);

            if (wifiSetting && wifiSetting.ip_address) {
                setAcademySsid(wifiSetting.ssid || '학원 와이파이');
                if (wifiSetting.ip_address === ipRes.ip) {
                    setIsWifiConnected(true);
                } else {
                    console.log('WiFi IP mismatch:', { registered: wifiSetting.ip_address, current: ipRes.ip });
                    setIsWifiConnected(false);
                }
            } else {
                // 와이파이 설정이 없으면 출석 불가
                setIsWifiConnected(false);
            }
        } catch (error) {
            console.error('WiFi check error:', error);
            setIsWifiConnected(false);
        } finally {
            setIsWifiLoading(false);
        }
    };

    useEffect(() => {
        if (!isAttendanceChecked || isCheckOutDone) return;
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isAttendanceChecked, isCheckOutDone]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
    };

    const handleCheckIn = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase.from('attendance').insert({
            student_id: session.user.id,
            status: 'present',
            check_in_time: new Date().toISOString(),
            check_in_method: 'wifi'
        });

        if (!error) {
            setIsAttendanceChecked(true);
            setSeconds(0);
        } else {
            console.error('Check-in error:', error);
            alert(`등원 처리 중 오류가 발생했습니다: ${error.message} (${error.code})`);
        }
    };

    const handleCheckOut = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('attendance')
            .update({
                check_out_time: new Date().toISOString()
            })
            .eq('student_id', session.user.id)
            .eq('date', today);

        if (!error) {
            setIsCheckOutDone(true);
            alert('오늘 고생 많으셨습니다! 하원 처리가 완료되었습니다.');
        } else {
            console.error('Check-out error:', error);
            alert(`하원 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isApproved === false) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-80px)] items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center mb-8 text-orange-500">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 11-8 0 4 4 0 018 0zM7 10h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">가입 승인 대기 중</h1>
                <p className="text-gray-500 max-w-[280px] leading-relaxed mb-10 text-sm font-medium">
                    선생님께서 회원가입을 검토 중입니다.<br />승인이 완료되면 모든 서비스를 이용하실 수 있습니다.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 rounded-full border border-gray-100">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Verifying Account</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-80px)] items-center justify-center p-6 md:p-12 animate-fade-in">
            {/* Logo / Header */}
            <div className="mb-14 text-center">
                <div className="relative inline-block mb-6">
                    <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full" />
                    <Image
                        src="/logo.svg"
                        alt="타점국어"
                        width={180}
                        height={45}
                        className="h-12 w-auto relative z-10"
                        priority
                    />
                </div>
                <p className="text-gray-500 text-sm md:text-base font-medium tracking-tight">
                    {userName} 학생, 오늘도 함께 성장해요
                </p>
            </div>

            <div className="w-full max-w-2xl space-y-8">
                {/* Notice Banner */}
                <Link
                    href="/notices"
                    className="glass-panel group relative overflow-hidden rounded-[32px] p-5 md:p-6 flex items-center justify-between group cursor-pointer hover:border-primary/20 transition-all duration-300 active:scale-[0.99]"
                >
                    <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10 overflow-hidden">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                            <svg className="w-5 h-5 transition-colors group-hover:text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="overflow-hidden">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">학원 공지</span>
                            <span className="text-sm md:text-base text-gray-800 font-bold truncate block group-hover:text-primary transition-colors">
                                {latestNotice ? latestNotice.title : '공지사항이 없습니다.'}
                            </span>
                        </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>

                {/* Attendance / Timer Section - White Theme (Mobile Only) */}
                <div className="md:hidden glass-panel rounded-[40px] p-10 text-center relative overflow-hidden shadow-glow">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -mr-24 -mt-24 blur-3xl animate-pulse" />
                    <div className="relative z-10">
                        <div className="text-orange-500 text-[10px] md:text-xs font-bold tracking-[0.25em] mb-6 uppercase">Today Learning Time</div>
                        <div className="text-6xl md:text-7xl font-black text-gray-900 tracking-tight font-mono mb-10">
                            {formatTime(seconds)}
                        </div>

                        {!isAttendanceChecked ? (
                            <div className="space-y-4">
                                <button
                                    onClick={handleCheckIn}
                                    disabled={!isWifiConnected || isWifiLoading}
                                    className="px-12 py-4.5 bg-primary hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none text-white font-bold rounded-2xl text-lg transition-all shadow-xl shadow-primary/25 active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                    {isWifiLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                                        </svg>
                                    )}
                                    {isWifiLoading ? '네트워크 확인 중...' : '등원하기'}
                                </button>
                                {!isWifiLoading && !isWifiConnected && (
                                    <p className="text-[11px] text-red-500 font-bold animate-pulse">
                                        학원 와이파이에 연결해야 출석할 수 있습니다.
                                    </p>
                                )}
                            </div>
                        ) : isCheckOutDone ? (
                            <div className="inline-flex flex-col items-center gap-3">
                                <div className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gray-900 text-white rounded-full shadow-xl">
                                    <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-bold uppercase tracking-wider">Today's Learning Finished</span>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">오늘도 열심히 공부했네요!</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-orange-50 rounded-full border border-orange-100">
                                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                                    <span className="text-orange-700 text-sm font-bold uppercase tracking-wider">Learning Now</span>
                                </div>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={!isWifiConnected || isWifiLoading}
                                    className="block px-12 py-4 bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 font-bold rounded-2xl text-lg transition-all shadow-md active:scale-95 mx-auto"
                                >
                                    {isWifiLoading ? '네트워크 확인 중...' : '하원하기'}
                                </button>
                                {!isWifiLoading && !isWifiConnected && (
                                    <p className="text-[11px] text-red-500 font-bold animate-pulse">
                                        학원 와이파이에 연결해야 하원할 수 있습니다.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid - Moved to bottom */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="glass-panel rounded-[32px] p-5 md:p-6 flex flex-col justify-center items-center text-center group hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
                            <span className="text-[11px] md:text-xs font-bold text-gray-400 mb-2 group-hover:text-primary/70 transition-colors uppercase tracking-widest">{stat.label}</span>
                            <span className="text-xl md:text-2xl font-black text-gray-900 group-hover:text-primary transition-colors tracking-tight">{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}

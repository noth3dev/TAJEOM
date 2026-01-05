'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface AttendanceRecord {
    id: string;
    student_id: string;
    class_id: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: 'present' | 'late' | 'absent' | 'excused';
    classes: { name: string };
    users: { name: string };
}

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showWifiModal, setShowWifiModal] = useState(false);
    const [wifiSsid, setWifiSsid] = useState('');
    const [currentIp, setCurrentIp] = useState('');
    const [wifiLoading, setWifiLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    setLoading(false);
                    return;
                }

                // Get role
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                setUserRole(userData?.role || 'student');

                let query = supabase
                    .from('attendance')
                    .select('*, users(name)')
                    .order('date', { ascending: false });

                if (userData?.role === 'student') {
                    query = query.eq('student_id', session.user.id);
                } else if (userData?.role === 'parent') {
                    // 학부모인 경우 연동된 자녀들의 ID 목록을 먼저 조회
                    const { data: linkedChildren } = await supabase
                        .from('parent_student_links')
                        .select('student_id')
                        .eq('parent_id', session.user.id);

                    const studentIds = linkedChildren?.map(l => l.student_id) || [];
                    query = query.in('student_id', studentIds);
                } else {
                    query = query.eq('date', selectedDate);
                }

                const { data } = await query;
                setAttendance((data as any[]) || []);
            } catch (error) {
                console.error('Error fetching attendance data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        if (userRole !== 'student') fetchWifiSettings();
    }, [selectedDate, userRole]);

    const fetchWifiSettings = async () => {
        const { data } = await supabase.from('wifi_settings').select('ssid, ip_address').maybeSingle();
        if (data) {
            setWifiSsid(data.ssid || '');
            setCurrentIp(data.ip_address);
        }
    };

    const handleUpdateStatus = async (recordId: string, newStatus: AttendanceRecord['status']) => {
        const { error } = await supabase
            .from('attendance')
            .update({ status: newStatus })
            .eq('id', recordId);

        if (!error) {
            setAttendance(prev => prev.map(a => a.id === recordId ? { ...a, status: newStatus } : a));
        } else {
            alert('상태 변경 중 오류가 발생했습니다.');
        }
    };

    const handleSetWifi = async () => {
        setWifiLoading(true);
        try {
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
            alert('출석용 와이파이 설정이 완료되었습니다.');
        } catch (error) {
            console.error('Wifi setting error:', error);
            alert('와이파이 설정 중 오류가 발생했습니다.');
        } finally {
            setWifiLoading(false);
        }
    };

    const stats = {
        total: attendance.length,
        present: attendance.filter((a) => a.status === 'present').length,
        late: attendance.filter((a) => a.status === 'late').length,
        absent: attendance.filter((a) => a.status === 'absent').length,
    };

    const getStatusBadge = (status: AttendanceRecord['status']) => {
        switch (status) {
            case 'present':
                return <span className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full font-bold">출석</span>;
            case 'late':
                return <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs rounded-full font-bold">지각</span>;
            case 'absent':
                return <span className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-bold">결석</span>;
            case 'excused':
                return <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full font-bold">조퇴/기타</span>;
        }
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-0 py-6 md:py-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">출석 관리</h1>
                        <p className="text-xs md:text-sm text-gray-400 mt-1 font-medium">
                            {userRole === 'teacher' ? '일자별 전체 출석 현황을 관리하세요' :
                                userRole === 'parent' ? '자녀의 출결 기록을 확인하세요' :
                                    '나의 출결 기록을 확인하세요'}
                        </p>
                    </div>
                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowWifiModal(true)}
                                className="px-5 py-2.5 bg-primary/10 text-primary rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-primary/20 transition-all active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0O1.394 9.141c5.857-5.858 15.355-5.858 21.212 0" />
                                </svg>
                                와이파이 설정
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-5 py-2.5 border border-gray-100 rounded-2xl bg-white focus:ring-2 focus:ring-primary/20 outline-none text-xs font-black shadow-sm transition-all cursor-pointer"
                            />
                        </div>
                    )}
                    {(userRole === 'student' || userRole === 'parent') && (
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-5 py-2.5 border border-gray-100 rounded-2xl bg-white focus:ring-2 focus:ring-primary/20 outline-none text-xs font-black shadow-sm transition-all cursor-pointer"
                        />
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="glass-panel rounded-[32px] p-5 md:p-6 shadow-glow border-0 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">전체</p>
                        <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                    </div>
                    <div className="glass-panel rounded-[32px] p-5 md:p-6 shadow-glow border-0 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">출석</p>
                        <p className="text-2xl font-black text-green-600">{stats.present}</p>
                    </div>
                    <div className="glass-panel rounded-[32px] p-5 md:p-6 shadow-glow border-0 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">지각</p>
                        <p className="text-2xl font-black text-primary">{stats.late}</p>
                    </div>
                    <div className="glass-panel rounded-[32px] p-5 md:p-6 shadow-glow border-0 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">결석</p>
                        <p className="text-2xl font-black text-red-600">{stats.absent}</p>
                    </div>
                </div>

                {/* Attendance List */}
                <div className="glass-panel rounded-[40px] shadow-glow border-0 overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : attendance.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="bg-gray-50/10">
                                    <tr>
                                        {userRole !== 'student' && (
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">학생</th>
                                        )}
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">날짜</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">등원</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">하원</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {attendance.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group text-[13px]">
                                            {userRole !== 'student' && (
                                                <td className="px-6 py-5">
                                                    <span className="font-bold text-gray-900">{record.users?.name}</span>
                                                </td>
                                            )}
                                            <td className="px-6 py-5 text-gray-600 font-medium">{record.date}</td>
                                            <td className="px-6 py-5 font-mono text-gray-900">{formatTime(record.check_in_time)}</td>
                                            <td className="px-6 py-5 font-mono text-gray-900">{formatTime(record.check_out_time)}</td>
                                            <td className="px-6 py-5">
                                                {(userRole === 'teacher' || userRole === 'admin') ? (
                                                    <select
                                                        value={record.status}
                                                        onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                                                        className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider border-none cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none transition-all ${record.status === 'present' ? 'bg-green-500/10 text-green-600' :
                                                            record.status === 'late' ? 'bg-primary/10 text-primary' :
                                                                record.status === 'absent' ? 'bg-red-500/10 text-red-600' : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                    >
                                                        <option value="present">출석</option>
                                                        <option value="late">지각</option>
                                                        <option value="absent">결석</option>
                                                        <option value="excused">기타</option>
                                                    </select>
                                                ) : (
                                                    getStatusBadge(record.status)
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-400 font-medium text-sm">해당 날짜의 출석 기록이 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* Wifi Settings Modal */}
                {showWifiModal && (
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowWifiModal(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-scale-in">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-gray-900">출석 와이파이 설정</h2>
                                <button onClick={() => setShowWifiModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6 text-center">
                                <div className="text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">와이파이 이름 (SSID)</label>
                                    <input
                                        type="text"
                                        value={wifiSsid}
                                        onChange={(e) => setWifiSsid(e.target.value)}
                                        placeholder="예: 학원_FREE_WIFI"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white transition-all"
                                    />
                                </div>

                                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 text-left">
                                    <p className="text-[11px] text-orange-600 font-bold mb-2 flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        검증용 IP 주소
                                    </p>
                                    <p className="text-[11px] text-gray-500 font-medium mb-3">학생들이 이 IP에서만 출석할 수 있게 됩니다.</p>
                                    <p className="text-sm font-black text-gray-900">{currentIp || 'IP 감지 중...'}</p>
                                </div>

                                <button
                                    onClick={handleSetWifi}
                                    disabled={wifiLoading}
                                    className="w-full py-4.5 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {wifiLoading ? '설정 중...' : '현재 네트워크로 설정'}
                                </button>
                                <p className="text-[10px] text-gray-300">반드시 학원 와이파이에 연결된 상태에서 실행하세요.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';

interface ClassItem {
    id: string;
    name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    color: string;
    teacher_id: string;
    teacher?: { name: string };
    student_count?: number;
}

interface Student {
    id: string;
    name: string;
    school_name: string;
}

interface ClassPreset {
    id: string;
    name: string;
    teacher_id: string;
    is_public: boolean;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];
const HOURS = Array.from({ length: 20 }, (_, i) => (i + 8) % 24);
const HOUR_HEIGHT = 48;

const COLORS = [
    { name: 'orange', bg: 'bg-orange-500', hex: '#f97316', label: '오렌지' },
    { name: 'blue', bg: 'bg-blue-500', hex: '#3b82f6', label: '블루' },
    { name: 'indigo', bg: 'bg-indigo-500', hex: '#6366f1', label: '인디고' },
    { name: 'rose', bg: 'bg-rose-500', hex: '#f43f5e', label: '로즈' },
    { name: 'emerald', bg: 'bg-emerald-500', hex: '#10b981', label: '에메랄드' },
    { name: 'violet', bg: 'bg-violet-500', hex: '#8b5cf6', label: '바이올렛' },
    { name: 'amber', bg: 'bg-amber-500', hex: '#f59e0b', label: '앰버' },
    { name: 'slate', bg: 'bg-slate-700', hex: '#334155', label: '다크그레이' },
];

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [enrolledStudents, setEnrolledStudents] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentsForNewClass, setSelectedStudentsForNewClass] = useState<string[]>([]);

    // Preset States
    const [presets, setPresets] = useState<ClassPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [isSavingPreset, setIsSavingPreset] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const timetableRef = useRef<HTMLDivElement>(null);

    const [nextClass, setNextClass] = useState<ClassItem | null>(null);
    const [dynamicHourHeight, setDynamicHourHeight] = useState(48);

    const [newClass, setNewClass] = useState({
        name: '',
        day_of_week: 1,
        start_time: '14:00',
        end_time: '16:00',
        color: 'orange'
    });

    // 다음 수업 계산 함수
    const calculateNextClass = (classList: ClassItem[]) => {
        if (!classList.length) return null;

        const now = new Date();
        const currentDay = now.getDay(); // 0-6 (Sun-Sat)
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const sorted = [...classList].sort((a, b) => {
            const aStart = a.day_of_week * 1440 + parseInt(a.start_time.split(':')[0]) * 60 + parseInt(a.start_time.split(':')[1]);
            const bStart = b.day_of_week * 1440 + parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]);

            const nowMinutes = currentDay * 1440 + currentTime;

            let aDiff = aStart - nowMinutes;
            if (aDiff <= 0) aDiff += 7 * 1440; // 이미 지났거나 현재 진행 중이면 다음 주로

            let bDiff = bStart - nowMinutes;
            if (bDiff <= 0) bDiff += 7 * 1440;

            return aDiff - bDiff;
        });

        return sorted[0];
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            setUserId(session.user.id);

            const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
            const role = userData?.role || 'student';
            setUserRole(role);

            // Fetch classes
            const { data: classesData } = await supabase.from('classes').select('*, teacher:users!classes_teacher_id_fkey(name)');
            if (classesData) {
                const withCounts = await Promise.all(classesData.map(async (cls) => {
                    const { count } = await supabase.from('class_students').select('*', { count: 'exact', head: true }).eq('class_id', cls.id);
                    return { ...cls, student_count: count || 0 };
                }));

                if (role === 'student') {
                    const { data: enrolled } = await supabase.from('class_students').select('class_id').eq('student_id', session.user.id);
                    const enrolledIds = enrolled?.map(e => e.class_id) || [];
                    const filtered = withCounts.filter(c => enrolledIds.includes(c.id));
                    setClasses(filtered);
                    setNextClass(calculateNextClass(filtered));
                } else if (role === 'parent') {
                    const { data: childLinks } = await supabase.from('parent_student_links').select('student_id').eq('parent_id', session.user.id);
                    const childIds = childLinks?.map(l => l.student_id) || [];
                    const { data: enrolled } = await supabase.from('class_students').select('class_id').in('student_id', childIds);
                    const enrolledIds = enrolled?.map(e => e.class_id) || [];
                    const filtered = withCounts.filter(c => enrolledIds.includes(c.id));
                    setClasses(filtered);
                    setNextClass(calculateNextClass(filtered));
                } else if (role === 'teacher') {
                    setClasses(withCounts.filter(c => c.teacher_id === session.user.id));
                } else {
                    setClasses(withCounts);
                }
            }

            // Fetch presets
            const { data: presetsData } = await supabase.from('class_presets').select('*').order('created_at', { ascending: false });
            if (presetsData) setPresets(presetsData);

            if (role === 'teacher' || role === 'admin') {
                const { data: students } = await supabase.from('users').select('id, name, school_name').eq('role', 'student').eq('is_approved', true);
                if (students) setAllStudents(students as any[]);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleResize = () => setDynamicHourHeight(window.innerWidth < 768 ? 40 : 48);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Preset Handlers ---
    const handleSaveAsPreset = async () => {
        if (!presetNameInput) return;
        setIsSavingPreset(true);
        try {
            const { data: preset, error: pError } = await supabase.from('class_presets').insert({
                name: presetNameInput,
                teacher_id: userId
            }).select().single();

            if (pError) throw pError;

            if (classes.length > 0) {
                const presetItems = classes.map(cls => ({
                    preset_id: preset.id,
                    name: cls.name,
                    day_of_week: cls.day_of_week,
                    start_time: cls.start_time,
                    end_time: cls.end_time,
                    color: cls.color
                }));
                const { error: iError } = await supabase.from('class_preset_items').insert(presetItems);
                if (iError) throw iError;
            }

            alert('현재 시간표가 프리셋으로 저장되었습니다.');
            setShowSavePresetModal(false);
            setPresetNameInput('');
            fetchData();
        } catch (error: any) {
            alert('프리셋 저장 실패: ' + error.message);
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleApplyPreset = async () => {
        if (!selectedPresetId) return;
        if (!confirm('현재 시간표의 모든 수업이 삭제되고 선택한 프리셋이 적용됩니다. 계속하시겠습니까?')) return;

        setLoading(true);
        try {
            // 1. Delete current classes for teacher
            await supabase.from('classes').delete().eq('teacher_id', userId);

            // 2. Fetch preset items
            const { data: items, error: iError } = await supabase.from('class_preset_items').select('*').eq('preset_id', selectedPresetId);
            if (iError) throw iError;

            // 3. Insert into classes
            if (items && items.length > 0) {
                const newClasses = items.map(item => ({
                    name: item.name,
                    day_of_week: item.day_of_week,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    color: item.color,
                    teacher_id: userId,
                    subject: '기타'
                }));
                const { error: cError } = await supabase.from('classes').insert(newClasses);
                if (cError) throw cError;
            }

            alert('프리셋이 성공적으로 적용되었습니다.');
            fetchData();
        } catch (error: any) {
            alert('프리셋 적용 실패: ' + error.message);
            setLoading(false);
        }
    };

    const handleTogglePublic = async () => {
        const preset = presets.find(p => p.id === selectedPresetId);
        if (!preset) return;

        const newStatus = !preset.is_public;
        const { error } = await supabase.from('class_presets').update({ is_public: newStatus }).eq('id', selectedPresetId);

        if (error) {
            alert('공개 설정 변경 실패: ' + error.message);
        } else {
            alert(newStatus ? '공개 프리셋으로 설정되었습니다.' : '공개 설정이 해제되었습니다.');
            fetchData();
        }
    };

    const handleDeletePreset = async () => {
        if (!selectedPresetId) return;
        if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;

        const { error } = await supabase.from('class_presets').delete().eq('id', selectedPresetId);
        if (error) alert('삭제 실패: ' + error.message);
        else {
            setSelectedPresetId('');
            fetchData();
        }
    };

    // --- Core Logic: Drag Move & Resize ---
    const isOverlapping = (classId: string | null, dayOfWeek: number, startTime: string, endTime: string, currentClasses: ClassItem[]) => {
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            const adjustedH = h < 8 ? h + 24 : h;
            return adjustedH * 60 + (m || 0);
        };

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);

        return currentClasses.some(cls => {
            if (cls.id === classId) return false;
            if (cls.day_of_week !== dayOfWeek) return false;

            const start = toMinutes(cls.start_time);
            const end = toMinutes(cls.end_time);

            return Math.max(newStart, start) < Math.min(newEnd, end);
        });
    };

    const handleClassDrop = async (classId: string, dayOfWeek: number, hour: number) => {
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        const [sH, sM] = cls.start_time.split(':').map(Number);
        const [eH, eM] = cls.end_time.split(':').map(Number);
        const durationMin = (eH < sH ? (eH + 24) * 60 + eM : eH * 60 + eM) - (sH * 60 + sM);
        const newStart = `${hour.toString().padStart(2, '0')}:00:00`;
        const endHourTotal = (hour * 60 + durationMin);
        const newEndH = (Math.floor(endHourTotal / 60)) % 24;
        const newEndM = endHourTotal % 60;
        const newEnd = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}:00`;

        if (isOverlapping(classId, dayOfWeek, newStart, newEnd, classes)) {
            alert('해당 시간에 이미 다른 수업이 있습니다.');
            return;
        }

        const { error } = await supabase.from('classes').update({ day_of_week: dayOfWeek, start_time: newStart, end_time: newEnd }).eq('id', classId);
        if (error) alert('이동 실패: ' + error.message);
        else fetchData();
    };

    const handleResizeStart = (e: React.MouseEvent, classId: string) => {
        e.preventDefault(); e.stopPropagation(); setResizingId(classId);
        const onMouseUp = async (upEvent: MouseEvent) => {
            document.removeEventListener('mouseup', onMouseUp); setResizingId(null);
            if (!timetableRef.current) return;
            const gridRect = timetableRef.current.getBoundingClientRect();
            const relativeY = upEvent.clientY - gridRect.top;            // HOUR_HEIGHT per hour
            let targetHour = Math.round(relativeY / dynamicHourHeight) + 8;

            const cls = classes.find(c => c.id === classId);
            if (!cls) return;

            const [sH] = cls.start_time.split(':').map(Number);
            const startH = (sH < 8 ? sH + 24 : sH);
            if (targetHour <= startH) targetHour = startH + 1;

            const finalEndH = targetHour % 24;
            const newEndTime = `${finalEndH.toString().padStart(2, '0')}:00:00`;

            if (isOverlapping(classId, cls.day_of_week, cls.start_time, newEndTime, classes)) {
                alert('해당 시간에 이미 다른 수업이 있습니다.');
                return;
            }

            const { error } = await supabase.from('classes').update({ end_time: newEndTime }).eq('id', classId);
            if (error) alert('시간 변경 실패: ' + error.message);
            else fetchData();
        };

        document.addEventListener('mouseup', onMouseUp);
    };

    const openManageModal = async (cls: ClassItem) => {
        setSelectedClass(cls);
        const { data } = await supabase.from('class_students').select('student_id').eq('class_id', cls.id);
        setEnrolledStudents(data?.map(d => d.student_id) || []);
        setShowManageModal(true);
    };

    const toggleStudentEnrollment = async (studentId: string) => {
        if (!selectedClass) return;
        const isEnrolled = enrolledStudents.includes(studentId);
        if (isEnrolled) {
            await supabase.from('class_students').delete().eq('class_id', selectedClass.id).eq('student_id', studentId);
            setEnrolledStudents(prev => prev.filter(id => id !== studentId));
        } else {
            await supabase.from('class_students').insert({ class_id: selectedClass.id, student_id: studentId });
            setEnrolledStudents(prev => [...prev, studentId]);
        }
        fetchData();
    };

    const getPositionStyle = (startTime: string, endTime: string) => {
        const [sH, sM] = startTime.split(':').map(Number);
        const [eH, eM] = endTime.split(':').map(Number);
        const startH = (sH < 8 ? sH + 24 : sH); const endH = (eH < 8 ? eH + 24 : eH);
        const startPos = (startH - 8) * dynamicHourHeight + (sM / 60) * dynamicHourHeight;
        const endPos = (endH - 8) * dynamicHourHeight + (eM / 60) * dynamicHourHeight;
        return { top: `${startPos}px`, height: `${endPos - startPos}px` };
    };

    const getGlassyStyle = (colorName: string) => {
        const color = COLORS.find(c => c.name === colorName) || COLORS[0];
        return { background: `linear-gradient(135deg, ${color.hex}22 0%, ${color.hex}11 100%)`, borderLeft: `3px solid ${color.hex}`, color: color.hex };
    };

    const handleAddClass = async () => {
        if (!newClass.name) return;
        const startTime = `${newClass.start_time}:00`;
        const endTime = `${newClass.end_time}:00`;

        if (isOverlapping(null, newClass.day_of_week, startTime, endTime, classes)) {
            alert('해당 시간에 이미 다른 수업이 있습니다.');
            return;
        }

        const { data, error } = await supabase.from('classes').insert({ ...newClass, subject: '기타', teacher_id: userId, start_time: startTime, end_time: endTime }).select().single();
        if (error) return alert('생성 실패: ' + error.message);
        if (data && selectedStudentsForNewClass.length > 0) await supabase.from('class_students').insert(selectedStudentsForNewClass.map(sid => ({ class_id: data.id, student_id: sid })));
        setShowAddModal(false); fetchData(); setSelectedStudentsForNewClass([]);
    };

    const handleDuplicateClass = async (cls: ClassItem) => {
        if (isOverlapping(null, cls.day_of_week, cls.start_time, cls.end_time, classes)) {
            alert('복제하려는 시간에 이미 다른 수업이 있습니다.');
            return;
        }
        const { error } = await supabase.from('classes').insert({ ...cls, id: undefined, name: `${cls.name} (복사)`, teacher_id: userId, created_at: undefined, updated_at: undefined });
        if (error) alert('복제 실패: ' + error.message); else fetchData();
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('수업을 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message); else { setShowManageModal(false); fetchData(); }
    };

    const currentPreset = presets.find(p => p.id === selectedPresetId);

    return (
        <DashboardLayout>
            <div className={`space-y-6 ${isDragging ? 'cursor-grabbing' : ''}`}>
                {/* Next Class Info */}
                {nextClass && (userRole === 'student' || userRole === 'parent') && (
                    <div className="px-4 md:px-0 mb-2">
                        <p className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md text-[10px] uppercase font-black tracking-wider">Next</span>
                            <span className="text-gray-400 font-medium">{DAYS[nextClass.day_of_week]}요일 {nextClass.start_time.slice(0, 5)}</span>
                            <span className="font-black">[{nextClass.name}]</span>
                        </p>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 md:px-0">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">수업 관리</h1>
                        <p className="text-xs text-gray-400 mt-1">
                            {userRole === 'teacher' || userRole === 'admin'
                                ? '드래그로 이동 및 시간 조절이 가능합니다.'
                                : userRole === 'parent'
                                    ? '자녀의 수업 시간표를 확인하세요.'
                                    : '나의 수업 시간표를 확인하세요.'}
                        </p>
                    </div>

                    {(userRole === 'teacher' || userRole === 'admin') && (
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedPresetId && currentPreset?.teacher_id === userId && (
                                <button
                                    onClick={handleTogglePublic}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${currentPreset.is_public ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                >
                                    {currentPreset.is_public ? '✅ 공개 중' : '공개 프리셋으로 설정'}
                                </button>
                            )}
                            <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                수업 추가
                            </button>
                        </div>
                    )}
                </div>

                {/* Preset Bar */}
                {(userRole === 'teacher' || userRole === 'admin') && (
                    <div className="px-4 md:px-0">
                        <div className="bg-gray-50/50 p-2 md:p-3 rounded-3xl flex flex-wrap items-center gap-3">
                            <select
                                value={selectedPresetId}
                                onChange={(e) => setSelectedPresetId(e.target.value)}
                                className="px-4 py-2 bg-white border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                <option value="">프리셋 불러오기...</option>
                                <optgroup label="나의 프리셋">
                                    {presets.filter(p => p.teacher_id === userId).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}{p.is_public ? ' (공개)' : ''}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="공개 프리셋">
                                    {presets.filter(p => p.teacher_id !== userId && p.is_public).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </optgroup>
                            </select>

                            {selectedPresetId && (
                                <button onClick={handleApplyPreset} disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-2xl text-[11px] font-black hover:bg-gray-800 transition-all shadow-sm">
                                    적용하기
                                </button>
                            )}

                            {selectedPresetId && currentPreset?.teacher_id === userId && (
                                <button onClick={handleDeletePreset} className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}

                            <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                            <button
                                onClick={() => setShowSavePresetModal(true)}
                                className="ml-auto flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 rounded-2xl text-xs font-bold hover:bg-orange-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                현재 시간표 저장
                            </button>
                        </div>
                    </div>
                )}

                {/* Timetable Grid */}
                <div className="bg-white rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <div className="min-w-[600px] md:min-w-[800px]">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] md:grid-cols-[80px_repeat(7,1fr)] bg-gray-50/20 border-b border-gray-100">
                            <div className="p-3 md:p-4" />
                            {DISPLAY_DAYS.map(dayIdx => (
                                <div key={dayIdx} className="p-3 md:p-4 text-center font-black text-[8px] md:text-[9px] text-gray-400 uppercase tracking-widest">{DAYS[dayIdx]}</div>
                            ))}
                        </div>
                        <div className="relative" style={{ height: `${HOURS.length * dynamicHourHeight}px` }} ref={timetableRef}>
                            {HOURS.map((hour, idx) => (
                                <div key={idx} className="grid grid-cols-[60px_repeat(7,1fr)] md:grid-cols-[80px_repeat(7,1fr)] border-b border-gray-50 last:border-0" style={{ height: `${dynamicHourHeight}px` }}>
                                    <div className="flex items-start justify-center pt-1.5 text-[8px] md:text-[9px] font-bold text-gray-300">{hour.toString().padStart(2, '0')}:00</div>
                                    {DISPLAY_DAYS.map(dayIdx => (
                                        <div
                                            key={dayIdx}
                                            className="border-r border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                const classId = e.dataTransfer.getData('classId');
                                                if (classId) handleClassDrop(classId, dayIdx, hour);
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                            <div className="absolute top-0 left-[60px] md:left-[80px] right-0 h-full pointer-events-none">
                                <div className="grid grid-cols-7 h-full">
                                    {DISPLAY_DAYS.map(dayIdx => (
                                        <div key={dayIdx} className="relative h-full">
                                            {classes.filter(cls => cls.day_of_week === dayIdx).map(cls => (
                                                <div
                                                    key={cls.id}
                                                    draggable={(userRole === 'teacher' || userRole === 'admin') && !resizingId}
                                                    onDragStart={(e) => { e.dataTransfer.setData('classId', cls.id); setIsDragging(true); }}
                                                    onDragEnd={() => setIsDragging(false)}
                                                    onClick={() => (userRole === 'teacher' || userRole === 'admin') && openManageModal(cls)}
                                                    className={`absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded-lg md:rounded-xl p-1.5 md:p-3 shadow-sm cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all group pointer-events-auto backdrop-blur-sm overflow-hidden flex flex-col ${resizingId === cls.id ? 'z-50 ring-2 ring-orange-400' : ''}`}
                                                    style={{ ...getGlassyStyle(cls.color), ...getPositionStyle(cls.start_time, cls.end_time) }}
                                                >
                                                    <div className="flex justify-between items-start gap-1">
                                                        <h4 className="text-[10px] md:text-[12px] font-bold leading-none truncate">{cls.name}</h4>
                                                        {(userRole === 'teacher' || userRole === 'admin') && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateClass(cls); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/50 rounded transition-all shrink-0">
                                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <span className="text-[8px] md:text-[9px] font-bold opacity-60 leading-none">{cls.student_count}명</span>
                                                        <span className="text-[7px] md:text-[8px] font-mono opacity-40 leading-none">{cls.start_time.slice(0, 5)}</span>
                                                    </div>
                                                    {(userRole === 'teacher' || userRole === 'admin') && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-black/5" onMouseDown={(e) => handleResizeStart(e, cls.id)}>
                                                            <div className="w-6 h-0.5 bg-black/10 rounded-full" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Preset Modal */}
                {showSavePresetModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                        <div className="bg-white w-full max-w-sm rounded-[40px] p-8 md:p-10 shadow-2xl">
                            <h2 className="text-xl font-bold mb-6 text-center text-gray-900">시간표 프리셋 저장</h2>
                            <p className="text-xs text-gray-400 mb-6 text-center leading-relaxed">
                                현재 등록된 {classes.length}개의 수업을<br />새로운 프리셋으로 저장합니다.
                            </p>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="프리셋 이름 (예: 2024 상반기)"
                                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold focus:bg-white border border-transparent focus:border-gray-100 outline-none transition-all"
                                    value={presetNameInput}
                                    onChange={e => setPresetNameInput(e.target.value)}
                                />
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setShowSavePresetModal(false)}
                                        className="flex-1 py-4 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSaveAsPreset}
                                        disabled={isSavingPreset || !presetNameInput}
                                        className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50"
                                    >
                                        {isSavingPreset ? '저장 중...' : '저장하기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Modals (Manage, Add) remain the same as previous step */}
                {showManageModal && selectedClass && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-xl">
                        <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-10 shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl md:text-2xl font-black">{selectedClass.name} 관리</h2>
                                <button onClick={() => setShowManageModal(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
                                <div className="space-y-6">
                                    <div className="p-6 bg-gray-50 rounded-[32px]">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-widest px-1">배경 컬러</p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {COLORS.map(c => (
                                                <button key={c.name} onClick={() => {
                                                    supabase.from('classes').update({ color: c.name }).eq('id', selectedClass.id).then(fetchData);
                                                    setSelectedClass({ ...selectedClass, color: c.name });
                                                }} className={`w-8 h-8 rounded-full shadow-sm transition-all ${c.bg} ${selectedClass.color === c.name ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-105'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteClass(selectedClass.id)} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-all text-xs tracking-widest">수업 삭제</button>
                                </div>
                                <div className="flex flex-col h-full overflow-hidden">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-widest px-1">수강 학생 ({enrolledStudents.length}명)</p>
                                    <div className="relative mb-4">
                                        <input type="text" placeholder="학생 찾기..." className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold border border-transparent focus:bg-white focus:border-gray-100 outline-none transition-all" onChange={e => setStudentSearch(e.target.value)} />
                                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {allStudents.filter(s => s.name.includes(studentSearch)).map(s => {
                                            const isEnrolled = enrolledStudents.includes(s.id);
                                            return (
                                                <div key={s.id} className="flex justify-between items-center p-4 bg-white border border-gray-50 rounded-2xl hover:border-gray-100 transition-all">
                                                    <div><p className="text-[13px] font-bold text-gray-900">{s.name}</p><p className="text-[9px] text-gray-400">{s.school_name || '-'}</p></div>
                                                    <button onClick={() => toggleStudentEnrollment(s.id)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${isEnrolled ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>{isEnrolled ? '수강 중' : '추가'}</button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                        <div className="bg-white w-full max-w-sm rounded-[40px] p-8 md:p-10 shadow-2xl">
                            <h2 className="text-xl font-bold mb-8 text-center text-gray-900">새 수업 추가</h2>
                            <div className="space-y-4">
                                <input type="text" placeholder="수업 명칭" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold focus:bg-white border border-transparent focus:border-gray-100 outline-none transition-all" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold font-mono" value={newClass.start_time} onChange={e => setNewClass({ ...newClass, start_time: e.target.value })} />
                                    <input type="time" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold font-mono" value={newClass.end_time} onChange={e => setNewClass({ ...newClass, end_time: e.target.value })} />
                                </div>
                                <button onClick={handleAddClass} className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl shadow-xl hover:bg-gray-800 transition-all mt-6">만들기</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f1f1; border-radius: 10px; }`}</style>
        </DashboardLayout>
    );
}

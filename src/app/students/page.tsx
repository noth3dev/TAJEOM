'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

interface CustomColumn {
    id: string;
    title: string;
    order_index: number;
}

interface CustomValue {
    student_id: string;
    column_id: string;
    value: string;
}

interface Student {
    id: string;
    name: string;
    school_name: string;
    birth_year: number;
}

export default function StudentTablePage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [columns, setColumns] = useState<CustomColumn[]>([]);
    const [values, setValues] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
                router.push('/');
                return;
            }

            fetchData();
        };

        checkAccess();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: studentData },
                { data: columnData },
                { data: valueData }
            ] = await Promise.all([
                supabase.from('users').select('id, name, school_name, birth_year').eq('role', 'student').eq('is_approved', true).order('name'),
                supabase.from('student_custom_columns').select('*').order('order_index'),
                supabase.from('student_custom_values').select('*')
            ]);

            if (studentData) setStudents(studentData);
            if (columnData) setColumns(columnData);

            if (valueData) {
                const valuesMap: Record<string, Record<string, string>> = {};
                valueData.forEach((v: CustomValue) => {
                    if (!valuesMap[v.student_id]) valuesMap[v.student_id] = {};
                    valuesMap[v.student_id][v.column_id] = v.value || '';
                });
                setValues(valuesMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim()) return;

        const { data, error } = await supabase
            .from('student_custom_columns')
            .insert({
                title: newColumnTitle,
                order_index: columns.length
            })
            .select()
            .single();

        if (!error && data) {
            setColumns([...columns, data]);
            setNewColumnTitle('');
            setIsAddingColumn(false);
        } else {
            console.error('Error adding column:', error);
            alert('컬럼 추가 중 오류가 발생했습니다.');
        }
    };

    const handleUpdateValue = async (studentId: string, columnId: string, newValue: string) => {
        // Optimistic update
        setValues(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [columnId]: newValue
            }
        }));

        const { error } = await supabase
            .from('student_custom_values')
            .upsert({
                student_id: studentId,
                column_id: columnId,
                value: newValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id, column_id' });

        if (error) {
            console.error('Error updating value:', error);
        }
    };

    const handleDeleteColumn = async (columnId: string) => {
        if (!confirm('이 컬럼을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) return;

        const { error } = await supabase
            .from('student_custom_columns')
            .delete()
            .eq('id', columnId);

        if (!error) {
            setColumns(columns.filter(c => c.id !== columnId));
        } else {
            console.error('Error deleting column:', error);
            alert('컬럼 삭제 중 오류가 발생했습니다.');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header />
            <main className="max-w-[95%] mx-auto px-6 pt-24 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">학생 관리 표</h1>
                        <p className="text-gray-400 font-medium text-sm">학생들의 정보를 자유롭게 기록하고 관리하세요</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="학생 이름 검색"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold"
                            />
                            <svg className="absolute right-4 top-3 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            onClick={() => setIsAddingColumn(true)}
                            className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-orange-500 transition-all shadow-lg shadow-gray-200 flex items-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            가로줄 추가
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest min-w-[150px] sticky left-0 bg-gray-50/90 backdrop-blur-sm z-10">학생 이름</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">학교 / 생년</th>
                                    {columns.map(col => (
                                        <th key={col.id} className="px-6 py-5 text-left group min-w-[200px]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{col.title}</span>
                                                <button
                                                    onClick={() => handleDeleteColumn(col.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.filter(s => s.name.includes(searchQuery)).map(student => (
                                    <tr key={student.id} className="group hover:bg-orange-50/30 transition-colors">
                                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-orange-50/90 backdrop-blur-sm z-10">
                                            <div className="font-bold text-gray-900">{student.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 font-medium">
                                                {student.school_name}
                                                <span className="mx-1 text-gray-300">·</span>
                                                {student.birth_year ? `${student.birth_year}년생` : '-'}
                                            </div>
                                        </td>
                                        {columns.map(col => (
                                            <td key={col.id} className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    value={values[student.id]?.[col.id] || ''}
                                                    onChange={(e) => handleUpdateValue(student.id, col.id, e.target.value)}
                                                    placeholder="내용 입력..."
                                                    className="w-full bg-transparent border-b border-transparent focus:border-orange-500/30 focus:outline-none py-1 text-sm text-gray-600 placeholder:text-gray-300 transition-all"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + 2} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="p-4 bg-gray-50 rounded-full">
                                                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-400 font-medium">관리 중인 학생이 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Column Modal */}
            {isAddingColumn && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 sm:p-0">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsAddingColumn(false)} />
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-scale-in">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-gray-900">컬럼 추가</h2>
                            <button onClick={() => setIsAddingColumn(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">컬럼 제목</label>
                                <input
                                    type="text"
                                    value={newColumnTitle}
                                    onChange={(e) => setNewColumnTitle(e.target.value)}
                                    placeholder="예: 과제 현황, 시험 점수 등"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleAddColumn}
                                className="w-full py-4.5 bg-gray-900 text-white font-black rounded-2xl shadow-lg shadow-gray-200 hover:bg-orange-500 transition-all active:scale-95"
                            >
                                추가하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

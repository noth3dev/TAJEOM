'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { searchSchools, SchoolInfo } from '@/lib/neis';

export default function AccountManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    // 학교 수정을 위한 상태
    const [isSchoolEditing, setIsSchoolEditing] = useState(false);
    const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
    const [schoolResults, setSchoolResults] = useState<SchoolInfo[]>([]);

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
            const [{ data: userData }, { data: linkData }] = await Promise.all([
                supabase.from('users').select('*').order('name'),
                supabase.from('parent_student_links')
                    .select('parent_id, student_id, parent:users!parent_student_links_parent_id_fkey(name), student:users!parent_student_links_student_id_fkey(name)')
            ]);

            if (userData) setUsers(userData);
            if (linkData) setLinks(linkData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('users')
            .update({
                name: editingUser.name,
                school_name: editingUser.school_name,
                birth_year: editingUser.birth_year
            })
            .eq('id', editingUser.id);

        if (!error) {
            setEditingUser(null);
            fetchData();
        }
    };

    const handleDeleteUser = async (user: any, deleteLinkedParent: boolean = false) => {
        if (user.role === 'student' && deleteLinkedParent) {
            const linkedParents = links.filter(l => l.student_id === user.id).map(l => l.parent_id);
            if (linkedParents.length > 0) {
                await supabase.from('users').delete().in('id', linkedParents);
            }
        }

        const { error } = await supabase.from('users').delete().eq('id', user.id);
        if (!error) {
            setIsDeleting(null);
            fetchData();
        } else {
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleSchoolSearch = async (val: string) => {
        setSchoolSearchQuery(val);
        if (val.length < 2) {
            setSchoolResults([]);
            return;
        }
        const results = await searchSchools(val);
        setSchoolResults(results);
    };

    const students = users.filter(u => u.role === 'student' && u.name.includes(searchQuery));
    const parents = users.filter(u => u.role === 'parent' && u.name.includes(searchQuery));

    const getLinkedParents = (studentId: string) => {
        return links
            .filter(l => l.student_id === studentId)
            .map(l => l.parent?.name)
            .filter(Boolean);
    };

    const getLinkedStudents = (parentId: string) => {
        return links
            .filter(l => l.parent_id === parentId)
            .map(l => l.student?.name)
            .filter(Boolean);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header />
            <main className="max-w-7xl mx-auto px-6 pt-24 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">계정 관리</h1>
                        <p className="text-gray-400 font-medium text-sm">학생 및 학부모 계정을 통합 관리합니다</p>
                    </div>
                    <div className="relative w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="이름으로 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        <svg className="absolute right-5 top-3.5 w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    {/* Student List Section */}
                    <section className="bg-white/50 p-8 rounded-[40px] border border-gray-100 min-h-[600px] flex flex-col">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                            <h2 className="text-2xl font-black text-gray-900">학생 명단</h2>
                            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">{students.length}</span>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 overscroll-contain">
                            {students.map(user => (
                                <div key={user.id} className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 text-lg">{user.name}</span>
                                            <span className="text-[11px] text-gray-400 font-medium">· {user.birth_year ? `${user.birth_year}년생` : '년도 미입력'}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-400 font-medium">
                                                {user.school_name || '학교 정보 없음'}
                                            </p>
                                            {getLinkedParents(user.id).length > 0 && (
                                                <p className="text-[11px] text-orange-400 font-bold flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    보호자: {getLinkedParents(user.id).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingUser(user)} className="p-2.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => setIsDeleting(user.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Parent List Section */}
                    <section className="bg-white/50 p-8 rounded-[40px] border border-gray-100 min-h-[600px] flex flex-col">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="w-1.5 h-6 bg-gray-400 rounded-full" />
                            <h2 className="text-2xl font-black text-gray-900">학부모 명단</h2>
                            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">{parents.length}</span>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 overscroll-contain">
                            {parents.map(user => (
                                <div key={user.id} className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg mb-1">{user.name}</p>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-400 font-medium">학부모 회시</p>
                                            {getLinkedStudents(user.id).length > 0 && (
                                                <p className="text-[11px] text-orange-400 font-bold flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                                    </svg>
                                                    자녀: {getLinkedStudents(user.id).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingUser(user)} className="p-2.5 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => setIsDeleting(user.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 sm:p-0">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative animate-scale-in">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900">정보 수정</h2>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">이름</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full text-xl font-bold text-gray-900 bg-gray-50 border-b-2 border-transparent px-4 py-4 rounded-2xl focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                                />
                            </div>
                            {editingUser.role === 'student' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">학교</label>
                                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="font-bold text-gray-900">{editingUser.school_name || '정보 없음'}</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsSchoolEditing(true)}
                                                className="text-[11px] bg-white text-gray-600 px-4 py-2 rounded-xl font-black border border-gray-100 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all shadow-sm"
                                            >
                                                변경
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-5 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-95">
                                    수정 완료
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* School Search Inner Modal */}
                    {isSchoolEditing && (
                        <div className="absolute inset-x-8 top-8 bottom-8 bg-white rounded-[40px] p-10 z-[102] shadow-2xl flex flex-col animate-scale-in">
                            <h2 className="text-2xl font-black text-gray-900 mb-8">학교 검색</h2>
                            <div className="relative mb-6">
                                <input
                                    type="text"
                                    value={schoolSearchQuery}
                                    onChange={(e) => handleSchoolSearch(e.target.value)}
                                    placeholder="학교 이름을 입력하세요"
                                    className="w-full text-lg font-bold text-gray-900 border-b-2 border-gray-100 px-1 py-4 focus:outline-none focus:border-orange-500 transition-colors"
                                    autoFocus
                                />
                                <svg className="absolute right-2 top-4.5 w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 mb-8 overscroll-contain px-1">
                                {schoolResults.map((s, idx) => (
                                    <button
                                        key={`${s.code}-${idx}`}
                                        onClick={() => {
                                            setEditingUser({ ...editingUser, school_name: s.name, school_type: s.type });
                                            setIsSchoolEditing(false);
                                        }}
                                        className="w-full text-left p-5 hover:bg-orange-50 rounded-2xl border border-transparent hover:border-orange-100 transition-all group"
                                    >
                                        <div className="font-bold text-gray-900 text-base mb-1 group-hover:text-orange-500">{s.name}</div>
                                        <div className="text-[11px] text-gray-400 font-medium">{s.type} · {s.address}</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsSchoolEditing(false)} className="w-full py-5 bg-gray-50 text-gray-400 font-black rounded-2xl hover:bg-gray-100 transition-colors">닫기</button>
                        </div>
                    )}
                </div>
            )}

            {/* Deletion Confirm Modal */}
            {isDeleting && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsDeleting(null)} />
                    <div className="bg-white w-full max-w-[340px] rounded-[32px] p-8 shadow-2xl relative animate-scale-in text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">계정을 삭제할까요?</h2>
                        <p className="text-gray-400 text-[13px] mb-8 leading-relaxed font-medium">삭제된 정보는 즉시 소멸되며<br />절대 복구할 수 없습니다.</p>

                        {users.find(u => u.id === isDeleting)?.role === 'student' && getLinkedParents(isDeleting).length > 0 && (
                            <div className="mb-6 p-5 bg-orange-50 rounded-2xl text-left border border-orange-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1 h-3 bg-orange-400 rounded-full" />
                                    <p className="text-[11px] font-black text-orange-600 uppercase tracking-tight">연동된 보호자가 있습니다</p>
                                </div>
                                <p className="text-[11px] text-gray-500 font-medium mb-4 leading-relaxed pl-3">보호자 계정도 함께 삭제할까요?</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => handleDeleteUser(users.find(u => u.id === isDeleting), true)}
                                        className="w-full py-2.5 bg-orange-500 text-white text-[11px] font-black rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20"
                                    >
                                        모든 계정 일괄 삭제
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(users.find(u => u.id === isDeleting), false)}
                                        className="w-full py-2.5 bg-white text-gray-400 border border-orange-100 text-[11px] font-black rounded-xl hover:bg-gray-50 transition-all"
                                    >
                                        학생 계정만 삭제
                                    </button>
                                </div>
                            </div>
                        )}

                        {!(users.find(u => u.id === isDeleting)?.role === 'student' && getLinkedParents(isDeleting).length > 0) && (
                            <button
                                onClick={() => handleDeleteUser(users.find(u => u.id === isDeleting))}
                                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl mb-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 active:scale-95"
                            >
                                삭제하기
                            </button>
                        )}
                        <button onClick={() => setIsDeleting(null)} className="w-full py-3 text-gray-300 text-sm font-bold hover:text-gray-500 transition-colors">취소</button>
                    </div>
                </div>
            )}
        </div>
    );
}

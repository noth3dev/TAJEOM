'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import { searchSchools, SchoolInfo } from '@/lib/neis';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [linkedParents, setLinkedParents] = useState<any[]>([]);
    const [connectionCode, setConnectionCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isSchoolEditing, setIsSchoolEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SchoolInfo[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    // Name Editing State for Non-Students
    const [newName, setNewName] = useState('');

    const router = useRouter();

    useEffect(() => {
        async function fetchProfile() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }

                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                setUser(userData);
                setNewName(userData?.name || '');

                if (userData?.role === 'student') {
                    // 연동된 학부모 조회
                    const { data: links } = await supabase
                        .from('parent_student_links')
                        .select('parent_id, users!parent_student_links_parent_id_fkey(name, phone_number)')
                        .eq('student_id', session.user.id);

                    if (links) {
                        setLinkedParents(links.map(link => ({
                            id: link.parent_id,
                            name: (link.users as any).name,
                            phone: (link.users as any).phone_number
                        })));
                    }

                    // 기존 유효한 코드가 있는지 확인
                    const { data: codeData } = await supabase
                        .from('connection_codes')
                        .select('code, expires_at')
                        .eq('student_id', session.user.id)
                        .gt('expires_at', new Date().toISOString())
                        .maybeSingle();

                    if (codeData) {
                        setConnectionCode(codeData.code);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [router]);

    const handleSchoolSearch = async (val: string) => {
        setSearchQuery(val);
        if (val.length < 2) {
            setSearchResults([]);
            return;
        }
        const results = await searchSchools(val);
        setSearchResults(results);
    };

    const updateSchool = async (school: SchoolInfo) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    school_name: school.name,
                    school_type: school.type
                })
                .eq('id', user.id);

            if (!error) {
                setUser({ ...user, school_name: school.name, school_type: school.type });
                setIsSchoolEditing(false);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const updateName = async () => {
        if (!newName.trim() || newName === user.name) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ name: newName })
                .eq('id', user.id);

            if (!error) {
                setUser({ ...user, name: newName });
                alert('이름이 변경되었습니다.');
            } else {
                alert('이름 변경 실패: ' + error.message);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const generateCode = async () => {
        setGenerating(true);
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error } = await supabase
                .from('connection_codes')
                .insert({
                    code,
                    student_id: user.id,
                    expires_at: new Date(Date.now() + 10 * 60000).toISOString() // 10분 후 만료
                });

            if (!error) {
                setConnectionCode(code);
            } else {
                alert('코드 생성 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Error generating code:', error);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isStudent = user?.role === 'student';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header userName={user?.name || ''} />

            <main className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="w-full max-w-md bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 text-center">
                    {/* Profile Avatar Placeholder */}
                    <div className="w-24 h-24 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-orange-500">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-black text-gray-900 mb-1">{user?.name}</h1>

                    {/* Info Section */}
                    {isStudent ? (
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <p className="text-gray-400 text-sm font-medium">
                                {user?.school_name} · {user?.birth_year % 100}년생
                            </p>
                            <button
                                onClick={() => setIsSchoolEditing(true)}
                                className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-bold hover:bg-gray-200 transition-colors"
                            >
                                변경
                            </button>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                                {user?.role === 'teacher' ? '선생님' : user?.role === 'admin' ? '관리자' : '학부모님'}
                            </span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {isStudent ? (
                            <>
                                {linkedParents.length > 0 && (
                                    <div className="p-6 bg-orange-50/30 rounded-2xl border border-orange-100/50 text-left">
                                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4">연동된 학부모</h3>
                                        <div className="space-y-3">
                                            {linkedParents.map(parent => (
                                                <div key={parent.id} className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-900">{parent.name}</span>
                                                    <span className="text-xs text-gray-400 font-medium">{parent.phone}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">학부모 계정 연결</h3>
                                    {connectionCode ? (
                                        <div className="space-y-4">
                                            <div className="text-4xl font-black text-orange-500 tracking-[0.2em] font-mono py-2">
                                                {connectionCode}
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-medium">
                                                이 코드를 학부모님께 알려주세요.<br />(10분 후 만료됩니다)
                                            </p>
                                            <button
                                                onClick={generateCode}
                                                className="text-orange-500 text-[11px] font-bold underline underline-offset-4"
                                            >
                                                코드 재발급
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={generateCode}
                                            disabled={generating}
                                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                            {generating ? '생성 중...' : '연동 코드 생성하기'}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Non-Student: Name Edit Section */
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">내 정보 수정</h3>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-500 ml-1">이름 변경</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-bold focus:border-orange-500 outline-none transition-all"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="이름 입력"
                                        />
                                        <button
                                            onClick={updateName}
                                            disabled={isUpdating || newName === user.name}
                                            className="px-5 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50 disabled:bg-gray-400 transition-all"
                                        >
                                            변경
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 px-1">
                                        * 이름을 변경하면 모든 메뉴에 즉시 반영됩니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-4 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                        >
                            대시보드로 돌아가기
                        </button>
                    </div>
                </div>
            </main>

            {/* School Edit Modal (Only for Students) */}
            {isSchoolEditing && isStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsSchoolEditing(false)} />
                    <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative animate-scale-in">
                        <h2 className="text-xl font-black text-gray-900 mb-6">학교 정보 수정</h2>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSchoolSearch(e.target.value)}
                            placeholder="새로운 학교 이름 검색"
                            className="input-underline mb-4"
                            autoFocus
                        />
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 overscroll-contain">
                            {searchResults.map((school, idx) => (
                                <button
                                    key={`${school.code}-${idx}`}
                                    onClick={() => updateSchool(school)}
                                    disabled={isUpdating}
                                    className="w-full text-left p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100"
                                >
                                    <div className="font-bold text-gray-900 text-sm">{school.name}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{school.type} · {school.address}</div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsSchoolEditing(false)}
                            className="w-full py-4 text-gray-400 font-bold text-sm"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}

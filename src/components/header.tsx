'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

const icons: Record<string, ReactNode> = {
    home: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    book: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    ),
    clipboard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    ),
    check: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    chart: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    table: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ),
};

export default function Header() {
    const pathname = usePathname();
    const [userInfo, setUserInfo] = useState({ name: '', school: '', role: '' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        async function fetchUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase
                    .from('users')
                    .select('name, school_name, role')
                    .eq('id', session.user.id)
                    .single();
                if (data) {
                    setUserInfo({ name: data.name, school: data.school_name || '타점국어', role: data.role });
                }
            } else {
                setUserInfo({ name: '사용자', school: '타점국어', role: '' });
            }
        }
        fetchUser();
    }, []);

    const navItems = [
        { href: '/', label: '대시보드', icon: 'home' },
        ...(userInfo.role === 'teacher' || userInfo.role === 'admin' ? [
            { href: '/account', label: '계정 관리', icon: 'clipboard' },
            { href: '/students', label: '학생 관리', icon: 'table' }
        ] : []),
        { href: '/classes', label: '수업 관리', icon: 'book' },
        { href: '/assignments', label: '과제 관리', icon: 'clipboard' },
        { href: '/attendance', label: '출석 관리', icon: 'check' },
        { href: '/reports', label: '성적표', icon: 'chart' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-50 border-b-0">
            <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo & Info */}
                <div className="flex items-center gap-3">
                    {/* Hamburger Menu (Tablet only) */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="hidden md:block lg:hidden p-1 -ml-2 text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.svg" alt="타점국어" width={100} height={32} className="h-4 w-auto" />
                    </Link>
                    <div className="hidden lg:flex items-center gap-2 ml-4">
                        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                        <Link href="/profile" className="text-sm font-medium text-gray-500 hover:text-orange-500 transition-colors cursor-pointer">
                            {userInfo.school} {userInfo.name}
                        </Link>
                    </div>
                </div>

                {/* Mobile Info (Right side) */}
                <div className="flex lg:hidden items-center gap-3">
                    <div className="flex items-center gap-3 md:hidden">
                        <Link href="/profile" className="text-xs font-medium text-gray-500 hover:text-orange-500 transition-colors cursor-pointer">
                            {userInfo.school} {userInfo.name}
                        </Link>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = '/login';
                            }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                            로그아웃
                        </button>
                    </div>
                    <Link href="/notices" className="text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-orange-50 text-orange-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {icons[item.icon]}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-4">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/login';
                        }}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium px-2"
                    >
                        로그아웃
                    </button>
                    <Link href="/notices" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Sidebar (Tablet/Mobile) - Always rendered for animation */}
            <>
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={() => setIsSidebarOpen(false)}
                />
                {/* Drawer */}
                <div
                    className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <Image src="/logo.svg" alt="타점국어" width={100} height={32} className="h-4 w-auto" />
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-orange-50 text-orange-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        {icons[item.icon]}
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Sidebar Footer Info */}
                        <div className="absolute bottom-8 left-6 right-6">
                            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                                    {userInfo.name[0]}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold text-gray-900 truncate">{userInfo.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{userInfo.school}</div>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = '/login';
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            </>
        </header>
    );
}

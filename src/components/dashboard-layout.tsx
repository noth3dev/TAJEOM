'use client';

import Header from './header';
import BottomNav from './bottom-nav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="pt-28 pb-20 md:pb-8">
                <div className="max-w-7xl mx-auto md:px-6">
                    {children}
                </div>
            </main>
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}

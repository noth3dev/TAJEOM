'use client';

import Header from './header';
import BottomNav from './bottom-nav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white relative overflow-hidden flex flex-col">
            {/* Premium Background Elements */}
            <div className="bg-blob bg-blob-1 opacity-60" />
            <div className="bg-blob bg-blob-2 opacity-60" />

            <Header />
            <main className="flex-1 pt-24 pb-24 md:pb-12 relative z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    {children}
                </div>
            </main>
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}

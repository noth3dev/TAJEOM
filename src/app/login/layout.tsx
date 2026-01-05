'use client';

import { ReactNode } from 'react';

interface LoginLayoutProps {
    children: ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            {/* Premium Background Elements */}
            <div className="bg-blob bg-blob-1" />
            <div className="bg-blob bg-blob-2" />

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}

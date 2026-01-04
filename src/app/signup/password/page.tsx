'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context';

export default function PasswordPage() {
    const router = useRouter();
    const { data, updateData } = useRegistration();
    const [password, setPassword] = useState(data.password);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length >= 4) {
            updateData({ password });
            router.push('/login/school');
        }
    };

    const handleBack = () => {
        router.push('/login');
    };

    return (
        <div className="animate-slide-in">
            {/* Back button */}
            <button
                onClick={handleBack}
                className="mb-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
                ← 이전
            </button>

            {/* Progress */}
            <div className="mb-8">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '40%' }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">2 / 5</p>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                비밀번호를 설정하세요
            </h1>
            <p className="text-gray-500 mb-8">
                4자리 이상의 비밀번호를 입력해 주세요
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="input-underline pr-12"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? '숨기기' : '보기'}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={password.length < 4}
                    className="btn-primary mt-12"
                >
                    다음
                </button>
            </form>
        </div>
    );
}

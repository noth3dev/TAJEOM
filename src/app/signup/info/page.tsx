'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context';
import { supabase } from '@/lib/supabase';

export default function BasicInfoPage() {
    const router = useRouter();
    const { data, updateData } = useRegistration();
    const [name, setName] = useState(data.name);
    const [phone, setPhone] = useState(data.phoneNumber);

    const formatPhoneNumber = (val: string) => {
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedPhone = phone.replace(/\D/g, '');
        if (name.trim() && cleanedPhone.length >= 10) {
            updateData({ name: name.trim(), phoneNumber: phone });
            if (data.role === 'student') {
                router.push('/signup/school');
            } else {
                router.push('/signup/complete');
            }
        }
    };

    const isNextDisabled = !name.trim() || phone.replace(/\D/g, '').length < 10;
    const progress = data.role === 'student' ? '40%' : '66%';
    const step = `2 / ${data.role === 'student' ? '5' : '3'}`;

    return (
        <div className="animate-slide-in">
            {/* Progress */}
            <div className="mb-8">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: progress }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">{step}</p>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-gray-900 mb-2">
                정보를 입력해주세요
            </h1>
            <p className="text-gray-500 mb-10">
                연락을 위해 정확한 정보를 입력해 주세요
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">이름</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름 입력"
                        className="input-underline"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">전화번호</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="010-0000-0000"
                        className="input-underline"
                    />
                </div>

                <div className="flex gap-4 mt-12">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-24 py-5 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        이전
                    </button>
                    <button
                        type="submit"
                        disabled={isNextDisabled}
                        className="btn-primary"
                    >
                        다음
                    </button>
                </div>
            </form>
        </div>
    );
}

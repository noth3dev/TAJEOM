'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context';
import { searchSchools, SchoolInfo } from '@/lib/neis';

export default function SchoolPage() {
    const router = useRouter();
    const { data, updateData } = useRegistration();
    const [query, setQuery] = useState('');
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(data.school);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setSchools([]);
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchSchools(searchQuery);
            setSchools(results);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, handleSearch]);

    const handleSelect = (school: SchoolInfo) => {
        setSelectedSchool(school);
        setQuery(school.name);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSchool) {
            updateData({ school: selectedSchool });
            router.push('/signup/grade');
        }
    };

    const handleBack = () => {
        router.push('/signup/info');
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
                    <div className="progress-fill" style={{ width: '60%' }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">3 / 5</p>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                학교를 검색하세요
            </h1>
            <p className="text-gray-500 mb-8">
                다니고 있는 학교 이름을 검색해 주세요
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedSchool(null);
                    }}
                    placeholder="학교 이름 검색"
                    className="input-underline"
                    autoFocus
                />

                {/* Search Results */}
                {(schools.length > 0 || isLoading) && !selectedSchool && (
                    <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-400">
                                검색 중...
                            </div>
                        ) : (
                            schools.map((school, idx) => (
                                <div
                                    key={`${school.code}-${idx}`}
                                    onClick={() => handleSelect(school)}
                                    className="school-item"
                                >
                                    <div className="font-medium text-gray-900">{school.name}</div>
                                    <div className="text-sm text-gray-500">
                                        {school.type} · {school.address}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Selected School */}
                {selectedSchool && (
                    <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-500 rounded-xl animate-fade-in">
                        <div className="font-medium text-gray-900">{selectedSchool.name}</div>
                        <div className="text-sm text-gray-500">
                            {selectedSchool.type} · {selectedSchool.address}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!selectedSchool}
                    className="btn-primary mt-12"
                >
                    다음
                </button>
            </form>
        </div>
    );
}

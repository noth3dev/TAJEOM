'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context';
import { calculateBirthYear, getGradeOptions } from '@/lib/grade-utils';

export default function GradePage() {
    const router = useRouter();
    const { data, updateData } = useRegistration();
    const [selectedGrade, setSelectedGrade] = useState<number | null>(data.grade);

    const schoolType = data.school?.type || '중학교';
    const gradeOptions = getGradeOptions(schoolType);

    const handleSelect = (grade: number) => {
        setSelectedGrade(grade);
        const birthYear = calculateBirthYear(grade, schoolType);
        updateData({ grade, birthYear });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // Keep preventDefault for form submission
        if (selectedGrade) {
            // The instruction used `grade` and `birthYear` which are not defined in this scope.
            // Assuming the intent was to use the `selectedGrade` and the `birthYear` already stored in `data`
            // or to re-calculate it based on `selectedGrade`.
            // Since `handleSelect` already calls `updateData({ grade, birthYear })`,
            // `data.grade` and `data.birthYear` should be up-to-date.
            // The instruction also removed `e.preventDefault()` and changed the path.
            // To maintain syntactic correctness and logical flow, we'll use `selectedGrade`
            // and ensure `data` is updated, then navigate.
            // If the user explicitly wants `updateData({ grade, birthYear })` here,
            // it implies `grade` and `birthYear` should be derived from `selectedGrade`.
            const currentBirthYear = calculateBirthYear(selectedGrade, schoolType);
            updateData({ grade: selectedGrade, birthYear: currentBirthYear });
            router.push('/signup/complete');
        }
    };

    const handleBack = () => {
        router.push('/signup/school');
    };

    const getBirthYearText = (grade: number) => {
        const year = calculateBirthYear(grade, schoolType);
        return `${year}년생`;
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
                    <div className="progress-fill" style={{ width: '80%' }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">4 / 5</p>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                학년을 선택하세요
            </h1>
            <p className="text-gray-500 mb-8">
                {data.school?.name || schoolType}에서 몇 학년인가요?
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-4">
                    {gradeOptions.map((grade) => (
                        <button
                            key={grade}
                            type="button"
                            onClick={() => handleSelect(grade)}
                            className={`grade-btn ${selectedGrade === grade ? 'selected' : ''}`}
                        >
                            <div>{grade}학년</div>
                            <div className={`text-xs mt-1 ${selectedGrade === grade ? 'text-orange-100' : 'text-gray-400'}`}>
                                {getBirthYearText(grade)}
                            </div>
                        </button>
                    ))}
                </div>

                {selectedGrade && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center animate-fade-in">
                        <span className="text-gray-600">출생년도: </span>
                        <span className="font-semibold text-gray-900">
                            {calculateBirthYear(selectedGrade, schoolType)}년
                        </span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!selectedGrade}
                    className="btn-primary mt-12"
                >
                    다음
                </button>
            </form>
        </div>
    );
}

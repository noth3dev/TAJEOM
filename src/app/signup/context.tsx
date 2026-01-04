'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { SchoolInfo } from '@/lib/neis';

interface RegistrationData {
    role: 'student' | 'parent';
    name: string;
    phoneNumber: string;
    school: SchoolInfo | null;
    grade: number | null;
    birthYear: number | null;
}

interface RegistrationContextType {
    data: RegistrationData;
    updateData: (updates: Partial<RegistrationData>) => void;
    resetData: () => void;
}

const initialData: RegistrationData = {
    role: 'student',
    name: '',
    phoneNumber: '',
    school: null,
    grade: null,
    birthYear: null,
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<RegistrationData>(initialData);

    const updateData = (updates: Partial<RegistrationData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const resetData = () => {
        setData(initialData);
    };

    return (
        <RegistrationContext.Provider value={{ data, updateData, resetData }}>
            {children}
        </RegistrationContext.Provider>
    );
}

export function useRegistration() {
    const context = useContext(RegistrationContext);
    if (!context) {
        throw new Error('useRegistration must be used within a RegistrationProvider');
    }
    return context;
}

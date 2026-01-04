'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import StudentDashboard from '@/components/student-dashboard';
import TeacherDashboard from '@/components/teacher-dashboard';
import ParentDashboard from '@/components/parent-dashboard';
import { supabase } from '@/lib/supabase';

type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

interface User {
  id: string;
  name: string;
  role: UserRole;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        setSession(currentSession);

        if (currentSession?.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (userError) {
            console.error('Error fetching user profile:', userError);
          }

          if (userData) {
            setUser(userData);
          } else {
            // 세션은 있는데 프로필이 없으면 회원가입(정보입력)으로 이동
            router.replace('/signup');
          }
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  if (loading || (session && !user)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // 1. 로그인이 안 된 경우 (세션이 없는 경우)
  if (!session && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h12m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-8">타점국어 대시보드를 이용하시려면 로그인이 필요합니다.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full max-w-xs py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            로그인하러 가기
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const role = user?.role;
  const userName = user?.name || '사용자';

  const renderDashboard = () => {
    switch (role) {
      case 'student':
        return <StudentDashboard userName={userName} />;
      case 'parent':
        return <ParentDashboard userName={userName} />;
      case 'teacher':
      case 'admin':
        return <TeacherDashboard userName={userName} />;
      default:
        return <StudentDashboard userName={userName} />;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
}

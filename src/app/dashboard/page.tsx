import DashboardLayout from '@/components/dashboard-layout';

export default function DashboardPage() {
    const stats = [
        { label: '전체 학생', value: '127', change: '+3', color: 'orange' },
        { label: '오늘 출석', value: '98', change: '77%', color: 'green' },
        { label: '미제출 과제', value: '23', change: '-5', color: 'red' },
        { label: '이번 주 수업', value: '42', change: '', color: 'blue' },
    ];

    const recentActivities = [
        { time: '10분 전', content: '김민수 학생이 수학 과제를 제출했습니다.', type: 'assignment' },
        { time: '30분 전', content: '이지현 학생이 출석 체크했습니다.', type: 'attendance' },
        { time: '1시간 전', content: '영어 수업 PDF 자료가 업로드되었습니다.', type: 'homework' },
        { time: '2시간 전', content: '박철수 학생의 성적표가 생성되었습니다.', type: 'report' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-500 mt-1">오늘의 학원 현황을 확인하세요</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                        >
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <div className="flex items-end gap-2 mt-2">
                                <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                                {stat.change && (
                                    <span className={`text-sm font-medium ${stat.color === 'green' ? 'text-green-500' :
                                            stat.color === 'red' ? 'text-red-500' :
                                                'text-orange-500'
                                        }`}>
                                        {stat.change}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activities */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
                        <div className="space-y-4">
                            {recentActivities.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'assignment' ? 'bg-blue-500' :
                                            activity.type === 'attendance' ? 'bg-green-500' :
                                                activity.type === 'homework' ? 'bg-purple-500' :
                                                    'bg-orange-500'
                                        }`} />
                                    <div className="flex-1">
                                        <p className="text-gray-900">{activity.content}</p>
                                        <p className="text-sm text-gray-400">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 실행</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="p-4 bg-orange-50 rounded-xl text-left hover:bg-orange-100 transition-colors">
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <p className="font-medium text-gray-900">새 수업 만들기</p>
                            </button>
                            <button className="p-4 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="font-medium text-gray-900">과제 출제</p>
                            </button>
                            <button className="p-4 bg-green-50 rounded-xl text-left hover:bg-green-100 transition-colors">
                                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="font-medium text-gray-900">출석 체크</p>
                            </button>
                            <button className="p-4 bg-purple-50 rounded-xl text-left hover:bg-purple-100 transition-colors">
                                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <p className="font-medium text-gray-900">PDF 업로드</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

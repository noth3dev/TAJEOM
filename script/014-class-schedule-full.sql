-- 1. 기초 테이블 생성 (이미 있다면 무시)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    schedule TEXT,
    color TEXT DEFAULT 'orange',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 시간표용 컬럼 추가 (요일, 시작시간, 종료시간)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 3. 학생-수업 관계 테이블 생성
CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- 4. RLS 활성화
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- 5. 보안 정책 재설정 (관리 함수 활용)
DROP POLICY IF EXISTS "Teachers and admins can manage classes" ON public.classes;
CREATE POLICY "Teachers and admins can manage classes"
    ON public.classes FOR ALL
    TO authenticated
    USING (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin']))
    WITH CHECK (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin']));

DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
CREATE POLICY "Students can view enrolled classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.class_students 
        WHERE class_id = public.classes.id AND student_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Teachers and admins can manage class_students" ON public.class_students;
CREATE POLICY "Teachers and admins can manage class_students"
    ON public.class_students FOR ALL
    TO authenticated
    USING (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin']))
    WITH CHECK (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin']));

DROP POLICY IF EXISTS "Students can view own class_students" ON public.class_students;
CREATE POLICY "Students can view own class_students"
    ON public.class_students FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

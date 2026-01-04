-- 018-create-assignments-and-storage.sql
-- 과제 관리 기능을 위한 테이블 생성 및 스토리지 보안 정책 통합 스크립트

-- 1. 과제 테이블 생성 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
    file_url TEXT, -- 과제 PDF 파일 경로
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 과제 제출 테이블 생성 (없으면 생성)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    file_url TEXT, -- 학생이 제출한 파일 경로
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    UNIQUE(assignment_id, student_id)
);

-- 3. RLS 활성화
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 4. 과제 조회/관리 정책
DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.assignments;
CREATE POLICY "Teachers can manage assignments"
    ON public.assignments FOR ALL
    TO authenticated
    USING (created_by = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
    WITH CHECK (created_by = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']));

DROP POLICY IF EXISTS "Anyone relevant can view assignments" ON public.assignments;
CREATE POLICY "Anyone relevant can view assignments"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid() -- 만든 선생님
        OR EXISTS ( -- 수강 학생
            SELECT 1 FROM public.class_students 
            WHERE class_id = assignments.class_id AND student_id = auth.uid()
        )
        OR EXISTS ( -- 학부모 (자녀의 수업)
            SELECT 1 FROM public.parent_student_links psl
            JOIN public.class_students cs ON psl.student_id = cs.student_id
            WHERE cs.class_id = assignments.class_id AND psl.parent_id = auth.uid()
        )
        OR public.check_user_role(auth.uid(), ARRAY['admin', 'staff']) -- 관리자
    );

-- 5. 스토리지 보안 정책 (버킷 'assignments'가 생성된 후 작동)
-- 5.1 파일 조회 (누구나 가능 - 인증된 사용자)
DROP POLICY IF EXISTS "Public View Assignments" ON storage.objects;
CREATE POLICY "Public View Assignments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

-- 5.2 파일 업로드 (선생님만 가능)
DROP POLICY IF EXISTS "Teachers Upload Assignments" ON storage.objects;
CREATE POLICY "Teachers Upload Assignments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

-- 5.3 파일 삭제/수정 (선생님/관리자만 가능)
DROP POLICY IF EXISTS "Manage Assignments Files" ON storage.objects;
CREATE POLICY "Manage Assignments Files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

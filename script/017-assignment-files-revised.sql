-- [!] 'public.assignments' 테이블이 없는 경우를 대비한 통합 설치 스크립트입니다.

-- 1. 과제 테이블 (테이블이 없을 경우 생성)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT -- 파일 첨부를 위한 컬럼
);

-- 2. 과제 제출 테이블 (테이블이 없을 경우 생성)
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- 3. RLS 정책 재설정
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.assignments;
CREATE POLICY "Teachers can manage assignments"
  ON public.assignments FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
  WITH CHECK (created_by = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']));

DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
CREATE POLICY "Students can view class assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students 
      WHERE class_id = assignments.class_id AND student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      JOIN public.class_students cs ON psl.student_id = cs.student_id
      WHERE cs.class_id = assignments.class_id AND psl.parent_id = auth.uid()
    )
  );

-- 스토리지 정책 (assignments 버킷용 - 수동으로 버킷 'assignments'를 먼저 생성해야 함)
-- 버킷 생성이 완료된 후 아래 정책이 작동합니다.
CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

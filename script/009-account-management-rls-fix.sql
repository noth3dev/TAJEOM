-- 1. users 테이블 RLS 수정: 선생님도 학부모 정보를 조회할 수 있도록 허용
DROP POLICY IF EXISTS "Teachers can view students" ON public.users;
CREATE POLICY "Teachers can view students and parents"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'teacher'
    )
    AND role IN ('student', 'parent')
  );

-- 2. parent_student_links 테이블 RLS 수정: 선생님/관리자도 모든 연동 정보를 조회할 수 있도록 허용
DROP POLICY IF EXISTS "Teachers and admins can view all links" ON public.parent_student_links;
CREATE POLICY "Teachers and admins can view all links"
  ON public.parent_student_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

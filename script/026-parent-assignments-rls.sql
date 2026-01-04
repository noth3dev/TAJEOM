-- 026-parent-assignments-rls.sql
-- 학부모가 자녀의 과제를 조회할 수 있도록 assignments 테이블에 RLS 정책을 추가합니다.

-- 1. assignments 테이블에 대한 학부모 조회 권한 추가
-- (자녀가 수강하는 클래스의 과제만 조회 가능)
DROP POLICY IF EXISTS "Parents can view child class assignments" ON public.assignments;

CREATE POLICY "Parents can view child class assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.parent_student_links psl ON cs.student_id = psl.student_id
      WHERE psl.parent_id = auth.uid()
      AND cs.class_id = assignments.class_id
    )
  );

-- 1. 성적 테이블 RLS 초기화
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 완전 삭제
DROP POLICY IF EXISTS "Students can view own grades" ON grades;
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;
DROP POLICY IF EXISTS "Parents can view child grades" ON grades;
DROP POLICY IF EXISTS "Admins can do everything with grades" ON grades;
DROP POLICY IF EXISTS "grades_student_select" ON grades;
DROP POLICY IF EXISTS "grades_staff_all" ON grades;
DROP POLICY IF EXISTS "grades_parent_select" ON grades;
DROP POLICY IF EXISTS "grades_staff_access" ON grades;
DROP POLICY IF EXISTS "grades_staff_all_access" ON grades;
DROP POLICY IF EXISTS "grades_select_student" ON grades;
DROP POLICY IF EXISTS "grades_all_staff" ON grades;
DROP POLICY IF EXISTS "grades_select_parent" ON grades;

-- 3. 가장 단순하고 확실한 정책으로 재설정

-- [공통] 본인이 생성한 데이터는 무조건 접근 가능 (가장 확실함)
CREATE POLICY "grades_owner_all" ON grades
FOR ALL USING (auth.uid() = created_by OR auth.uid() = student_id);

-- [선생님/관리자] 역할 기반 전체 접근
-- 재귀 방지를 위해 auth.uid()의 role을 직접 확인하는 대신 
-- JWT 메타데이터나 단순 EXISTS를 사용하되, recursion을 피하기 위해 check_user_role 함수 재활용
CREATE POLICY "grades_staff_select_all" ON grades
FOR SELECT USING (
  public.check_user_role(auth.uid(), ARRAY['admin', 'teacher'])
);

CREATE POLICY "grades_staff_manage_all" ON grades
FOR ALL USING (
  public.check_user_role(auth.uid(), ARRAY['admin', 'teacher'])
);

-- [학부모] 연동된 자녀 성적 조회
CREATE POLICY "grades_parent_select_all" ON grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parent_student_links 
    WHERE parent_id = auth.uid() AND student_id = grades.student_id
  )
);

-- 4. 수업(classes) 테이블 조회 권한 (성적표 join용)
DROP POLICY IF EXISTS "Allow anyone to view classes for reports" ON classes;
CREATE POLICY "Allow anyone to view classes for reports" ON classes
FOR SELECT USING (true);

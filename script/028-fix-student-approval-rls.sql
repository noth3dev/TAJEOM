-- 028-fix-student-approval-rls.sql
-- 선생님이 학생 가입 승인을 할 때 "승인 중 오류가 발생했습니다"라고 뜨는 RLS 정책 문제를 해결합니다.

-- 1. 기존의 재귀 위험이 있는 정책 삭제
DROP POLICY IF EXISTS "Teachers can update student approval" ON public.users;

-- 2. check_user_role 함수를 사용하여 안전하게 정책 재설정
-- 선생님과 관리자는 학생의 정보를 업데이트(승인 처리 등)할 수 있습니다.
CREATE POLICY "Teachers and admins can update student approval"
ON public.users
FOR UPDATE
USING (
  public.check_user_role(auth.uid(), ARRAY['teacher', 'admin']) 
  AND role = 'student'
)
WITH CHECK (
  role = 'student'
);

-- 3. (추가) 관리자는 모든 유저를 업데이트할 수 있도록 허용
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (
  public.check_user_role(auth.uid(), ARRAY['admin'])
);

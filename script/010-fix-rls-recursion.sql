-- 1. 무한 재귀를 방지하기 위한 권한 확인용 함수 생성 (SECURITY DEFINER 사용)
CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Teachers can view students" ON public.users;
DROP POLICY IF EXISTS "Teachers can view students and parents" ON public.users;

-- 3. 새로운 비재귀적 정책 설정

-- 관리자는 모든 계정 조회 가능 (함수 사용하여 재귀 방지)
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.check_user_role(auth.uid(), ARRAY['admin']));

-- 선생님은 학생 및 학부모 계정 조회 가능 (함수 사용하여 재귀 방지)
CREATE POLICY "Teachers can view students and parents"
  ON public.users FOR SELECT
  USING (public.check_user_role(auth.uid(), ARRAY['teacher']) AND role IN ('student', 'parent'));

-- 4. parent_student_links 테이블도 동일하게 적용
DROP POLICY IF EXISTS "Teachers and admins can view all links" ON public.parent_student_links;
CREATE POLICY "Teachers and admins can view all links"
  ON public.parent_student_links FOR SELECT
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'admin'])
  );

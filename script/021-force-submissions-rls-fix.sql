-- 021-force-submissions-rls-fix.sql
-- submissions 테이블의 모든 정책을 초기화하고 가장 확실한 권한을 부여하는 스크립트입니다.

-- 1. submissions 테이블의 모든 기존 정책 강제 삭제
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'submissions' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.submissions', pol.policyname);
    END LOOP;
END $$;

-- 2. RLS는 유지하되, 모든 작업(ALL)에 대해 학생 본인의 데이터라면 허용
-- (조회, 생성, 수정, 삭제 통합 정책)
CREATE POLICY "Allow students all actions on their own submissions"
ON public.submissions
FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- 3. 선생님과 관리자의 조회 및 채점(수정) 권한 강제 부여
CREATE POLICY "Allow teachers to view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'staff')
    )
);

CREATE POLICY "Allow teachers to update grades and feedback"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'staff')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'staff')
    )
);

-- 4. 확인: public.submissions에 RLS가 확실히 걸려있는지 확인
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

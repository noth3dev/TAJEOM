-- 020-fix-submissions-rls.sql
-- 과제 제출(submissions) 테이블의 RLS 보안 정책을 수정하여 학생이 과제를 제출할 수 있도록 합니다.

-- 1. 기존의 제한적인 정책 제거 (만약 있다면)
DROP POLICY IF EXISTS "Students can manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;

-- 2. 신규 정책 설정 (학생 본인의 제출물에 대한 제어권 부여)

-- 2.1 조회 (SELECT): 본인의 제출물만 조회 가능
CREATE POLICY "Students can view own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- 2.2 생성 (INSERT): 본인의 이름으로만 제출 가능
CREATE POLICY "Students can insert own submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- 2.3 수정 (UPDATE): 본인의 제출물만 수정 가능
CREATE POLICY "Students can update own submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- 3. 선생님/관리자 조회 권한 재설정 (이미 018에 있지만 확실히 하기 위해)
DROP POLICY IF EXISTS "Teachers can view class submissions" ON public.submissions;
CREATE POLICY "Teachers can view class submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.classes c ON a.class_id = c.id
        WHERE a.id = submissions.assignment_id AND 
        (c.teacher_id = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['admin', 'staff']))
    )
);

-- 4. 선생님 채점 권한 (UPDATE)
DROP POLICY IF EXISTS "Teachers can grade submissions" ON public.submissions;
CREATE POLICY "Teachers can grade submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.classes c ON a.class_id = c.id
        WHERE a.id = submissions.assignment_id AND 
        (c.teacher_id = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['admin', 'staff']))
    )
)
WITH CHECK (true);

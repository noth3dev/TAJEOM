-- 027-fix-parent-access.sql
-- 학부모가 자녀의 정보, 과제, 제출물을 온전히 조회할 수 없던 문제를 해결하는 통합 RLS 스크립트입니다.

-- 1. [Users] 학부모가 자녀의 프로필(이름, 학교 등)을 조회할 수 있도록 허용
DROP POLICY IF EXISTS "Parents can view child profiles" ON public.users;
CREATE POLICY "Parents can view child profiles"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links 
    WHERE parent_id = auth.uid() AND student_id = users.id
  )
);

-- 2. [Submissions] 학부모가 자녀의 과제 제출물을 조회할 수 있도록 허용
-- (기존에 작성했더라도 확실하게 다시 적용)
DROP POLICY IF EXISTS "Parents can view child submissions" ON public.submissions;
CREATE POLICY "Parents can view child submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links 
    WHERE parent_id = auth.uid() AND student_id = submissions.student_id
  )
);

-- 3. [Assignments] 학부모가 자녀의 과제 자체를 조회할 수 있도록 허용
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

-- 4. [Storage] 자녀가 올린 파일(Assignments 버킷) 조회 허용
-- 이미 022 정책(Authenticated Select)이 있다면 작동하겠지만, 확인차 명시하지 않아도 됨.
-- 다만, Signed URL이 아닌 Public URL을 쓰고 있으므로 bucket이 public이면 RLS 무관하게 보임.
-- 현재 setup-assignments-bucket (019)에서 'public'으로 설정했는지 체크 필요. 
-- 만약 private라면 아래 SELECT 정책이 필수. (022에서 전체 허용했으므로 패스)
-- 여기서는 DB 테이블(Row) 접근 권한이 핵심임.

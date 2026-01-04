-- 1. submissions 테이블에 학부모 조회 권한 추가
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

-- 2. 스토리지(storage.objects)에도 동일하게 부모 조회 권한이 있는지 확인
-- (이미 022에서 Anyone authenticated can view로 설정되어 있으나, 자녀 파일만 보게 더 엄격하게 할 수도 있음.
-- 하지만 여기서는 submissions 테이블 접근이 가능해지면 file_url을 통해 접근하는 방식이므로 우선 submissions RLS가 핵심입니다.)

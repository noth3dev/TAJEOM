-- 1. assignments 테이블에 file_url 컬럼 추가
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. 스토리지 버킷 생성을 위한 지침 (SQL로 버킷 생성이 완벽하지 않을 수 있으므로 정책 위주)
-- 'assignments' 버킷이 수동이나 다른 방식으로 생성되었다고 가정하고 정책 설정

-- 스토리지 정책 (assignments 버킷용)
-- bucket_id가 'assignments'인 경우에 대한 정책들

-- 2.1 조회: 모든 인증된 사용자 (학생 포함)
CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

-- 2.2 업로드: 선생님/관리자만
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

-- 2.3 삭제/수정: 본인 파일만 (또는 선생님/관리자)
CREATE POLICY "Teachers can update/delete assignment files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

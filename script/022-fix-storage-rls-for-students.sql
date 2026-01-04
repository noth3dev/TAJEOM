-- 022-fix-storage-rls-for-students.sql
-- 스토리지(Storage)의 'assignments' 버킷에 대한 업로드 권한을 학생에게도 부여하는 스크립트입니다.

-- 1. 기존의 제한적인 업로드 정책 삭제
DROP POLICY IF EXISTS "Teachers can upload assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers Upload Assignments" ON storage.objects;

-- 2. 신규 업로드 정책 (모든 인증된 사용자 - 학생 포함 - 가 파일을 올릴 수 있도록 허용)
-- 학생도 본인의 과제 제출을 위해 파일을 올려야 하므로 INSERT 권한이 필요합니다.
CREATE POLICY "Allow authenticated users to upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments'
);

-- 3. 확인: 조회 정책 (이미 누구나 볼 수 있게 되어 있지만 확실히 하기 위해 재설정)
DROP POLICY IF EXISTS "Anyone can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Public View Assignments" ON storage.objects;
CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

-- 4. 삭제 및 수정 정책 (선생님 및 관리자만 가능하도록 유지)
DROP POLICY IF EXISTS "Teachers can manage assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Manage Assignments Files" ON storage.objects;
CREATE POLICY "Teachers can manage/delete assignment files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

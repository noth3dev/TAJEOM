-- 019-setup-assignments-bucket-and-storage.sql
-- 과제 관리를 위한 스토리지 버킷 자동 생성 시도 및 보안 정책 통합 스크립트

-- [주의] Supabase 환경에 따라 SQL을 통한 버킷 생성이 제한될 수 있습니다. 
-- 만약 이 스크립트 실행 후에도 "Bucket not found" 에러가 발생한다면,
-- Supabase 대시보드 -> Storage 메뉴에서 'assignments'라는 이름의 Public 버킷을 직접 만들어주세요.

-- 1. 스토리지 버킷 생성 (extensions.http 가 활성화된 경우 작동 가능)
INSERT INTO storage.buckets (id, name, public)
SELECT 'assignments', 'assignments', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'assignments'
);

-- 2. 과제 PDF 파일 조회 정책 (모든 인증된 사용자)
DROP POLICY IF EXISTS "Anyone can view assignment files" ON storage.objects;
CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

-- 3. 과제 PDF 파일 업로드 정책 (선생님/관리자만)
DROP POLICY IF EXISTS "Teachers can upload assignment files" ON storage.objects;
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

-- 4. 과제 PDF 파일 수정/삭제 정책 (선생님/관리자만)
DROP POLICY IF EXISTS "Teachers can manage assignment files" ON storage.objects;
CREATE POLICY "Teachers can manage assignment files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'assignments' AND 
    (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
);

-- 5. 추가 보안: 과제 테이블 정보가 아직 없다면 생성
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    file_url TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

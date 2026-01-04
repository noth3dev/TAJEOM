-- 와이파이 설정 테이블
CREATE TABLE IF NOT EXISTS wifi_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ssid TEXT, -- 와이파이 이름 (표시용)
    ip_address TEXT NOT NULL, -- 와이파이 공용 IP (검증용)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Teachers and admins can do all on wifi settings" ON wifi_settings;
DROP POLICY IF EXISTS "All authenticated users can view wifi settings" ON wifi_settings;

-- 선생님/관리자는 모든 작업 가능 (이미 생성된 check_user_role 함수 활용)
CREATE POLICY "Teachers and admins can manage wifi"
    ON wifi_settings FOR ALL
    TO authenticated
    USING (check_user_role(auth.uid(), ARRAY['teacher', 'admin']))
    WITH CHECK (check_user_role(auth.uid(), ARRAY['teacher', 'admin']));

-- 모든 사용자는 조회 가능 (출석 검증용)
CREATE POLICY "Anyone can view wifi settings"
    ON wifi_settings FOR SELECT
    TO authenticated
    USING (true);

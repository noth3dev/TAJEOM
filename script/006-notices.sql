-- 학원 공지사항 테이블
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);

-- RLS 설정
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공지사항 조회 가능
CREATE POLICY "Notices are viewable by everyone"
  ON notices FOR SELECT
  USING (true);

-- 관리자/선생님만 공지사항 작성 및 수정 가능 (추후 확장 시 활용)
CREATE POLICY "Staff can manage notices"
  ON notices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 샘플 데이터 삽입
INSERT INTO notices (title, content) 
VALUES ('[안내] 2026년 1월 신학기 개강 및 교재 배부 안내', '안녕하세요. 타점국어입니다. 1월 신학기 개강 관련 안내드립니다...');

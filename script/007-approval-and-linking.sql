-- 1. users 테이블에 승인 상태 추가 (기존 데이터는 true로 설정하여 마이그레이션)
ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
UPDATE users SET is_approved = TRUE WHERE role IN ('teacher', 'admin', 'parent');

-- 2. 연동 코드 테이블 (QR3D2A 스타일)
CREATE TABLE connection_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- 3. 학부모-학생 연동 테이블
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- RLS 설정
ALTER TABLE connection_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 연동 코드만 생성/조회 가능
CREATE POLICY "Students can manage own connection codes"
  ON connection_codes FOR ALL
  USING (auth.uid() = student_id);

-- 학부모는 모든 연동 코드를 조회할 수 있어야 함 (인증용)
CREATE POLICY "Parents can view codes for verification"
  ON connection_codes FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'parent'));

-- 학부모-학생 링크 정책
CREATE POLICY "Users can view own links"
  ON parent_student_links FOR SELECT
  USING (auth.uid() = parent_id OR auth.uid() = student_id);

CREATE POLICY "Parents can create links via code entry"
  ON parent_student_links FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'parent'));

-- 승인 대기 중인 학생 조회를 위한 정책 (선생님 전용)
CREATE POLICY "Teachers can update student approval"
  ON users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'))
  WITH CHECK (role = 'student');

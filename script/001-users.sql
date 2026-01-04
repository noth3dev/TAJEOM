-- 사용자 프로필 테이블 (auth.users와 1:1 대응)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  school_type TEXT CHECK (school_type IN ('초등학교', '중학교', '고등학교')),
  birth_year INTEGER CHECK (birth_year IS NULL OR (birth_year >= 1990 AND birth_year <= 2025)),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school_name ON users(school_name);

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 정책: 사용자는 자신의 정보만 수정 가능
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 정책: 관리자는 모든 사용자 조회 가능 
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 정책: 선생님은 학생 조회 가능
CREATE POLICY "Teachers can view students"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'teacher'
    )
    AND role = 'student'
  );

-- 정책: 회원가입 시 삽입 허용 (인증된 사용자)
CREATE POLICY "Allow insert for authenticated users"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 정책: 서비스 역할로 삽입 허용 (회원가입용)
CREATE POLICY "Allow insert for service role"
  ON users FOR INSERT
  WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

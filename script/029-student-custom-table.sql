-- 학생 관리용 커스텀 컬럼 설정
CREATE TABLE student_custom_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학생별 커스텀 컬럼 값
CREATE TABLE student_custom_values (
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  column_id UUID REFERENCES student_custom_columns(id) ON DELETE CASCADE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, column_id)
);

-- RLS 활성화
ALTER TABLE student_custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_custom_values ENABLE ROW LEVEL SECURITY;

-- 선생님/관리자만 모든 작업 가능
CREATE POLICY "Teachers and admins can manage custom columns"
  ON student_custom_columns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'teacher' OR role = 'admin')
    )
  );

CREATE POLICY "Teachers and admins can manage custom values"
  ON student_custom_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'teacher' OR role = 'admin')
    )
  );

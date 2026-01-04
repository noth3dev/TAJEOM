-- 성적 테이블
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  grade TEXT, -- A, B+, B, etc.
  exam_type TEXT CHECK (exam_type IN ('midterm', 'final', 'quiz', 'homework', 'project')),
  exam_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학습 리포트 테이블
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  summary TEXT,
  strengths TEXT,
  improvements TEXT,
  teacher_comment TEXT,
  overall_grade TEXT,
  data JSONB, -- 상세 데이터 (점수, 출석률 등)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shared_with_parent BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학부모-학생 관계 테이블
CREATE TABLE parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('mother', 'father', 'guardian', 'other')),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- 인덱스
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_class ON grades(class_id);
CREATE INDEX idx_reports_student ON reports(student_id);
CREATE INDEX idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student ON parent_students(student_id);

-- RLS 활성화
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- Grades 정책
CREATE POLICY "Students can view own grades"
  ON grades FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage grades"
  ON grades FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM classes WHERE id = grades.class_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Parents can view child grades"
  ON grades FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_id = auth.uid() AND student_id = grades.student_id AND verified = true
  ));

-- Reports 정책
CREATE POLICY "Students can view own reports"
  ON reports FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage reports"
  ON reports FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Parents can view shared reports"
  ON reports FOR SELECT
  USING (
    shared_with_parent = true AND EXISTS (
      SELECT 1 FROM parent_students
      WHERE parent_id = auth.uid() AND student_id = reports.student_id AND verified = true
    )
  );

-- Parent Students 정책
CREATE POLICY "Parents can view own relationships"
  ON parent_students FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage relationships"
  ON parent_students FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- 트리거
CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

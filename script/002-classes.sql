-- 수업 테이블
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  schedule TEXT,
  color TEXT DEFAULT 'orange',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 수업-학생 관계 테이블
CREATE TABLE class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- 과제 테이블
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 과제 제출 테이블
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- 인덱스
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_class_students_class ON class_students(class_id);
CREATE INDEX idx_class_students_student ON class_students(student_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);

-- RLS 활성화
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Classes 정책
CREATE POLICY "Teachers can manage their classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Students can view enrolled classes"
  ON classes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM class_students WHERE class_id = classes.id AND student_id = auth.uid()
  ));

-- Class Students 정책
CREATE POLICY "Teachers can manage class students"
  ON class_students FOR ALL
  USING (EXISTS (
    SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view their enrollments"
  ON class_students FOR SELECT
  USING (student_id = auth.uid());

-- Assignments 정책
CREATE POLICY "Teachers can manage assignments"
  ON assignments FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM classes WHERE id = assignments.class_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view class assignments"
  ON assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM class_students WHERE class_id = assignments.class_id AND student_id = auth.uid()
  ));

-- Submissions 정책
CREATE POLICY "Students can manage own submissions"
  ON submissions FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view class submissions"
  ON submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid()
  ));

-- 트리거
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

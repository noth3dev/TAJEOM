-- PDF 숙제 테이블
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 숙제 다운로드 기록
CREATE TABLE homework_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 숙제 제출 테이블
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  UNIQUE(homework_id, student_id)
);

-- 인덱스
CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_homework_uploads ON homework(uploaded_by);
CREATE INDEX idx_homework_downloads_homework ON homework_downloads(homework_id);
CREATE INDEX idx_homework_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student ON homework_submissions(student_id);

-- RLS 활성화
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Homework 정책
CREATE POLICY "Teachers can manage homework"
  ON homework FOR ALL
  USING (uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM classes WHERE id = homework.class_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view class homework"
  ON homework FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM class_students WHERE class_id = homework.class_id AND student_id = auth.uid()
  ));

-- Homework Downloads 정책
CREATE POLICY "Users can track own downloads"
  ON homework_downloads FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view download stats"
  ON homework_downloads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM homework h
    JOIN classes c ON h.class_id = c.id
    WHERE h.id = homework_downloads.homework_id AND c.teacher_id = auth.uid()
  ));

-- Homework Submissions 정책
CREATE POLICY "Students can manage own homework submissions"
  ON homework_submissions FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view homework submissions"
  ON homework_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM homework h
    JOIN classes c ON h.class_id = c.id
    WHERE h.id = homework_submissions.homework_id AND c.teacher_id = auth.uid()
  ));

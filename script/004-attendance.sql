-- 출석 테이블
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'late', 'absent', 'excused')),
  check_in_method TEXT CHECK (check_in_method IN ('wifi', 'manual', 'qr')),
  device_info JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

-- Wi-Fi 체크인 설정 테이블
CREATE TABLE wifi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ssid TEXT NOT NULL,
  bssid TEXT,
  location_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- RLS 활성화
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_settings ENABLE ROW LEVEL SECURITY;

-- Attendance 정책
CREATE POLICY "Students can view own attendance"
  ON attendance FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can check in"
  ON attendance FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can manage class attendance"
  ON attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM classes WHERE id = attendance.class_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all attendance"
  ON attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Parents can view child attendance"
  ON attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'parent'
    -- 추후 parent-child 관계 테이블 연결 필요
  ));

-- Wi-Fi Settings 정책
CREATE POLICY "Admins can manage wifi settings"
  ON wifi_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Everyone can view wifi settings"
  ON wifi_settings FOR SELECT
  USING (is_active = true);

-- 트리거
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

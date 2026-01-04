-- 1. class_students 테이블 정책 업데이트
DROP POLICY IF EXISTS "Anyone can view class_students" ON public.class_students;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.class_students;
DROP POLICY IF EXISTS "Teachers can manage their class enrollments" ON public.class_students;

-- [SELECT] 학생, 학부모, 선생님 모두 조회 가능 (단, 본인 관련 데이터만)
CREATE POLICY "View class enrollments"
    ON public.class_students FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() -- 본인이 학생인 경우
        OR EXISTS ( -- 학부모인 경우: 연동된 자녀의 데이터 조회
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.class_students.student_id
        )
        OR public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']) -- 선생님/관리자
    );

-- [INSERT/DELETE] 선생님/관리자만 관리 가능
CREATE POLICY "Manage class enrollments"
    ON public.class_students FOR ALL
    TO authenticated
    USING (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
    WITH CHECK (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']));


-- 2. classes 테이블 정책 업데이트
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;

-- [SELECT] 관련 있는 사람만 조회 가능
CREATE POLICY "View accessible classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (
        teacher_id = auth.uid() -- 본인 수업
        OR EXISTS ( -- 학생이 수강 중인 수업
            SELECT 1 FROM public.class_students
            WHERE class_id = public.classes.id AND student_id = auth.uid()
        )
        OR EXISTS ( -- 학부모의 자녀가 수강 중인 수업
            SELECT 1 FROM public.class_students cs
            JOIN public.parent_student_links psl ON cs.student_id = psl.student_id
            WHERE cs.class_id = public.classes.id AND psl.parent_id = auth.uid()
        )
        OR public.check_user_role(auth.uid(), ARRAY['admin', 'staff']) -- 관리자
    );

-- [INSERT/UPDATE/DELETE] 선생님/관리자만 관리 가능
CREATE POLICY "Manage own classes"
    ON public.classes FOR ALL
    TO authenticated
    USING (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']))
    WITH CHECK (public.check_user_role(auth.uid(), ARRAY['teacher', 'admin', 'staff']));

-- 학부모가 연동된 자녀의 출석 기록만 볼 수 있도록 RLS 정책 강화
DROP POLICY IF EXISTS "Parents can view child attendance" ON public.attendance;

CREATE POLICY "Parents can view linked children attendance"
    ON public.attendance FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.attendance.student_id
        )
    );

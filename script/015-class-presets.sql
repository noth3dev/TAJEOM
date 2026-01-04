-- 1. 프리셋 마스터 테이블
CREATE TABLE public.class_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 프리셋 아이템 테이블 (수업 템플릿)
CREATE TABLE public.class_preset_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_id UUID REFERENCES public.class_presets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color TEXT DEFAULT 'orange'
);

-- 3. RLS 활성화
ALTER TABLE public.class_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_preset_items ENABLE ROW LEVEL SECURITY;

-- 4. 보안 정책
-- 교사는 본인의 프리셋을 관리하거나, 공개된 프리셋을 볼 수 있음
CREATE POLICY "Manage own presets or view public"
    ON public.class_presets FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid() OR is_public = true OR public.check_user_role(auth.uid(), ARRAY['admin']))
    WITH CHECK (teacher_id = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['admin']));

-- 프리셋 아이템은 해당 프리셋에 접근 가능할 때 조회 가능
CREATE POLICY "View accessible preset items"
    ON public.class_preset_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.class_presets 
            WHERE id = preset_id AND (teacher_id = auth.uid() OR is_public = true OR public.check_user_role(auth.uid(), ARRAY['admin']))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.class_presets 
            WHERE id = preset_id AND (teacher_id = auth.uid() OR public.check_user_role(auth.uid(), ARRAY['admin']))
        )
    );

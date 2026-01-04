-- 수업 테이블에 구조화된 시간 정보 추가
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 기존 schedule 텍스트 데이터를 기반으로 초기값 설정 (선택 사항, 여기선 생략)

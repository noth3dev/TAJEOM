-- users 테이블에 phone_number 컬럼 추가 및 기존 컬럼 NULL 허용 설정
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ALTER COLUMN school_name DROP NOT NULL,
ALTER COLUMN school_type DROP NOT NULL,
ALTER COLUMN birth_year DROP NOT NULL;

-- 기존 데이터가 있을 경우 기본값 처리 (필요시)
-- UPDATE public.users SET phone_number = '010-0000-0000' WHERE phone_number IS NULL;

-- phone_number 컬럼에 NOT NULL 제약 조건 추가 (데이터 정리 후 실행 권장)
-- ALTER TABLE public.users ALTER COLUMN phone_number SET NOT NULL;

-- birth_year 체크 제약 조건 업데이트
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_birth_year_check;
ALTER TABLE public.users ADD CONSTRAINT users_birth_year_check CHECK (birth_year IS NULL OR (birth_year >= 1990 AND birth_year <= 2025));

-- role 체크 제약 조건 업데이트 (parent 역할 추가)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'parent', 'admin'));

-- is_approved 컬럼 추가 (007에서 추가하지 않았을 경우 대비)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

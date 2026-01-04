-- 023-storage-lifecycle-policy.sql
-- 60일이 지난 오래된 과제 파일을 스토리지에서 자동으로 삭제하는 관리 스크립트입니다.

-- 1. pg_cron 확장 기능 활성화 (Supabase에서 자동 관리를 위해 필요)
create extension if not exists pg_cron;

-- 2. 오래된 파일을 삭제하는 함수 생성
create or replace function public.delete_old_assignment_files()
returns void as $$
begin
    -- 60일이 지난 storage.objects 삭제 (assignments 버킷 대상)
    -- 이 작업은 물리적인 파일도 함께 삭제합니다.
    delete from storage.objects
    where bucket_id = 'assignments'
      and created_at < now() - interval '60 days';

    -- [선택 사항] DB 테이블의 file_url 정보도 함께 정리 (broken link 방지)
    update public.assignments
    set file_url = null
    where created_at < now() - interval '60 days'
      and file_url is not null;

    update public.submissions
    set file_url = null
    where submitted_at < now() - interval '60 days'
      and file_url is not null;
end;
$$ language plpgsql;

-- 3. 매일 새벽 3시에 작업을 수행하도록 스케줄 등록
-- (이미 등록된 작업이 있다면 삭제 후 재등록하여 중복 방지)
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup-old-assignments');
EXCEPTION WHEN OTHERS THEN
    -- 작업이 없는 경우 발생하는 에러를 무시합니다.
END $$;

SELECT cron.schedule(
    'cleanup-old-assignments', -- 작업 이름
    '0 3 * * *',               -- 매일 새벽 3시 (Cron 표현식)
    'select public.delete_old_assignment_files()'
);

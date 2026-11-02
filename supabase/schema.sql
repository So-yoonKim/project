-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- 장바구니(내 나들이) 저장 테이블: 닉네임별로 담은 장소를 보관합니다.
create table if not exists trips (
  id bigint generated always as identity primary key,
  nickname text not null,
  item_key text not null,      -- 'sea:CNTS_000...' (카테고리:장소id)
  cat text not null,           -- village | sea | oreum | indoor | coffee | meal
  title text not null,
  addr text,
  lat text,
  lng text,
  created_at timestamptz default now(),
  unique (nickname, item_key)  -- 같은 장소를 두 번 담지 않게
);

alter table trips enable row level security;

-- ※ 실습용 정책(누구나 읽기·쓰기·삭제). 실제 서비스에서는 Supabase Auth 로그인 사용자만 쓰게 바꿉니다.
create policy "trips read all"   on trips for select using (true);
create policy "trips insert all" on trips for insert with check (true);
create policy "trips delete all" on trips for delete using (true);

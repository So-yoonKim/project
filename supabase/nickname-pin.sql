-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run  (supabase/schema.sql 을 먼저 실행한 뒤에)
--
-- 닉네임 + 숫자 비밀번호(4~6자리)로 장바구니를 보호합니다.
--  · 닉네임은 하나뿐입니다 (대소문자 구분 없이 중복 불가). 처음 쓰는 닉네임이면 그 비밀번호로 새로 만들어집니다.
--  · 비밀번호는 암호화(bcrypt)해서 저장하고, 5번 틀리면 15분 동안 잠깁니다.
--  · 로그인에 성공하면 임시 열쇠(token, 30일)를 줍니다. 브라우저에는 비밀번호가 아니라 이 열쇠만 남습니다.
--  · 브라우저(anon)는 trips·nicknames·nick_sessions 표를 직접 읽거나 쓸 수 없고, 아래 함수로만 접근합니다.

create extension if not exists pgcrypto with schema extensions;

-- ── 표 ──────────────────────────────────────────────
create table if not exists nicknames (
  nickname     text primary key,
  pin_hash     text not null,
  fail_count   int  not null default 0,
  locked_until timestamptz,
  created_at   timestamptz default now()
);
create unique index if not exists nicknames_lower_idx on nicknames (lower(nickname));

create table if not exists nick_sessions (
  token      uuid primary key default gen_random_uuid(),
  nickname   text not null references nicknames(nickname) on delete cascade,
  created_at timestamptz default now()
);

alter table nicknames    enable row level security;
alter table nick_sessions enable row level security;
alter table trips        enable row level security;

-- 정책이 하나도 없으면 브라우저는 이 표들을 직접 읽거나 쓸 수 없습니다.
-- 그래서 schema.sql 이 만들었던 "누구나 읽기·쓰기·삭제" 실습용 정책은 지웁니다.
drop policy if exists "trips read all"   on trips;
drop policy if exists "trips insert all" on trips;
drop policy if exists "trips delete all" on trips;

-- ── 함수 ─────────────────────────────────────────────
-- 열쇠 → 닉네임 (함수 안에서만 씁니다. 브라우저가 직접 부를 수 없게 아래에서 권한을 거둡니다)
create or replace function _nick_of(p_token uuid) returns text
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select nickname into n from nick_sessions
   where token = p_token and created_at > now() - interval '30 days';
  if n is null then raise exception 'bad_token'; end if;
  return n;
end $$;

-- 들어가기: 새 닉네임이면 만들고, 있는 닉네임이면 비밀번호를 확인한다.
-- 돌려주는 값: {status: created | ok | wrong | locked | invalid, nickname, token}
create or replace function nick_enter(p_nick text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  n   text := btrim(p_nick);
  rec nicknames%rowtype;
  tok uuid;
begin
  if n is null or char_length(n) < 1 or char_length(n) > 20 or p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into rec from nicknames where lower(nickname) = lower(n) for update;

  if not found then
    insert into nicknames (nickname, pin_hash) values (n, crypt(p_pin, gen_salt('bf')));
    insert into nick_sessions (nickname) values (n) returning token into tok;
    return jsonb_build_object('status', 'created', 'nickname', n, 'token', tok);
  end if;

  if rec.locked_until is not null and rec.locked_until > now() then
    return jsonb_build_object('status', 'locked');
  end if;

  if rec.pin_hash = crypt(p_pin, rec.pin_hash) then
    update nicknames set fail_count = 0, locked_until = null where nickname = rec.nickname;
    insert into nick_sessions (nickname) values (rec.nickname) returning token into tok;
    return jsonb_build_object('status', 'ok', 'nickname', rec.nickname, 'token', tok);
  end if;

  if rec.fail_count + 1 >= 5 then
    update nicknames set fail_count = 0, locked_until = now() + interval '15 minutes' where nickname = rec.nickname;
    return jsonb_build_object('status', 'locked');
  end if;
  update nicknames set fail_count = fail_count + 1 where nickname = rec.nickname;
  return jsonb_build_object('status', 'wrong');
end $$;

-- 나가기: 이 열쇠를 지운다
create or replace function nick_leave(p_token uuid) returns void
language sql security definer set search_path = public as $$
  delete from nick_sessions where token = p_token;
$$;

-- 장바구니: 모두 열쇠(token)로 닉네임을 확인한 뒤 그 닉네임의 것만 다룬다
create or replace function trips_list(p_token uuid)
returns table (item_key text, cat text, title text, addr text, lat text, lng text)
language plpgsql security definer set search_path = public as $$
declare n text := _nick_of(p_token);
begin
  return query
    select t.item_key, t.cat, t.title, t.addr, t.lat, t.lng
      from trips t where t.nickname = n order by t.created_at, t.id;
end $$;

create or replace function trips_add(p_token uuid, p_key text, p_cat text, p_title text, p_addr text, p_lat text, p_lng text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := _nick_of(p_token);
begin
  insert into trips (nickname, item_key, cat, title, addr, lat, lng)
  values (n, p_key, p_cat, p_title, p_addr, p_lat, p_lng)
  on conflict (nickname, item_key) do nothing;
end $$;

create or replace function trips_remove(p_token uuid, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := _nick_of(p_token);
begin
  delete from trips where nickname = n and item_key = p_key;
end $$;

create or replace function trips_clear(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare n text := _nick_of(p_token);
begin
  delete from trips where nickname = n;
end $$;

-- ── 권한: 필요한 함수만 브라우저(anon)가 부를 수 있게 ─────────────
revoke all on function _nick_of(uuid) from public, anon, authenticated;
revoke all on function nick_enter(text, text)                                       from public;
revoke all on function nick_leave(uuid)                                             from public;
revoke all on function trips_list(uuid)                                             from public;
revoke all on function trips_add(uuid, text, text, text, text, text, text)          from public;
revoke all on function trips_remove(uuid, text)                                     from public;
revoke all on function trips_clear(uuid)                                            from public;

grant execute on function nick_enter(text, text)                                    to anon, authenticated;
grant execute on function nick_leave(uuid)                                          to anon, authenticated;
grant execute on function trips_list(uuid)                                          to anon, authenticated;
grant execute on function trips_add(uuid, text, text, text, text, text, text)       to anon, authenticated;
grant execute on function trips_remove(uuid, text)                                  to anon, authenticated;
grant execute on function trips_clear(uuid)                                         to anon, authenticated;

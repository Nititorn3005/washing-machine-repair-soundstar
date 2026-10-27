-- ระบบบริหารงานซ่อมเครื่องซักผ้า — โครงสร้างสำหรับ API ฝั่งเซิร์ฟเวอร์
--
-- Additive only: never drops tables, columns or rows. Safe to run more than once
-- in the Supabase SQL Editor. Builds on the existing tables:
--   repair_jobs(id, created_at, updated_at, payload)
--   staff(id, created_at, role, active, display_name, username)
--   inventory_items(id, created_at, updated_at, name, item_code, unit, quantity, minimum_quantity)
--   inventory_transactions(id, created_at, note, quantity, item_id, repair_job_id, transaction_type)
--
-- Access model: the website never talks to Supabase directly. Netlify server
-- functions call these tables/RPCs with the service-role key (which bypasses
-- RLS). RLS stays on and anon/authenticated get no table or function grants.

-- ---------------------------------------------------------------------------
-- 1. Extra columns on existing tables
-- ---------------------------------------------------------------------------
alter table public.repair_jobs add column if not exists job_no text;
alter table public.repair_jobs add column if not exists status text;
alter table public.repair_jobs add column if not exists request_id text;

alter table public.inventory_items add column if not exists category text not null default '';
alter table public.inventory_items add column if not exists compatible text not null default '';
alter table public.inventory_items add column if not exists cost_price numeric(12,2) not null default 0;
alter table public.inventory_items add column if not exists sell_price numeric(12,2) not null default 0;
alter table public.inventory_items add column if not exists location text not null default '';
alter table public.inventory_items add column if not exists note text not null default '';

alter table public.inventory_transactions add column if not exists request_id text;
alter table public.inventory_transactions add column if not exists job_part_id uuid;
alter table public.inventory_transactions add column if not exists voided_at timestamptz;
alter table public.inventory_transactions add column if not exists reversal_of text;

-- Give uuid primary keys a default if they lack one (no-op otherwise).
do $$
declare t text;
begin
  foreach t in array array['repair_jobs','staff','inventory_items','inventory_transactions'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'id'
        and data_type = 'uuid' and column_default is null
    ) then
      execute format('alter table public.%I alter column id set default gen_random_uuid()', t);
    end if;
  end loop;
end $$;

-- Backfill job numbers / status for any pre-existing jobs (new columns only).
update public.repair_jobs
set job_no = coalesce(nullif(payload::jsonb->>'jobNo', ''), nullif(payload::jsonb->>'job_no', ''),
                      'JOB-OLD-' || left(id::text, 8))
where job_no is null;
update public.repair_jobs set status = coalesce(payload::jsonb->>'status', 'received') where status is null;

create unique index if not exists repair_jobs_job_no_key on public.repair_jobs (job_no);
create unique index if not exists repair_jobs_request_id_key on public.repair_jobs (request_id);
create unique index if not exists inventory_transactions_request_id_key on public.inventory_transactions (request_id);
create index if not exists inventory_transactions_item_idx on public.inventory_transactions (item_id, created_at desc);

-- Part codes unique / stock never negative. Skipped (with a notice) if existing
-- rows already violate them, so the migration never fails on old data.
do $$
begin
  begin
    create unique index if not exists inventory_items_item_code_key on public.inventory_items (item_code);
  exception when others then
    raise notice 'inventory_items.item_code has duplicates; unique index skipped: %', sqlerrm;
  end;
  if not exists (select 1 from pg_constraint where conname = 'inventory_items_quantity_nonneg') then
    alter table public.inventory_items
      add constraint inventory_items_quantity_nonneg check (quantity >= 0) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. New tables (FK column types follow the existing id types)
-- ---------------------------------------------------------------------------
do $$
declare
  job_id_type text := (select format_type(atttypid, atttypmod) from pg_attribute
                       where attrelid = 'public.repair_jobs'::regclass and attname = 'id');
  item_id_type text := (select format_type(atttypid, atttypmod) from pg_attribute
                        where attrelid = 'public.inventory_items'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists public.repair_job_parts (
      id uuid primary key default gen_random_uuid(),
      repair_job_id %s not null references public.repair_jobs(id),
      item_id %s not null references public.inventory_items(id),
      part_code text not null default '',
      part_name text not null default '',
      unit text not null default '',
      qty numeric(12,2) not null check (qty > 0),
      unit_cost numeric(12,2) not null default 0,
      unit_price numeric(12,2) not null default 0,
      note text not null default '',
      issued_at timestamptz not null default now(),
      cancelled_at timestamptz
    )$f$, job_id_type, item_id_type);

  execute format($f$
    create table if not exists public.repair_job_history (
      id uuid primary key default gen_random_uuid(),
      repair_job_id %s not null references public.repair_jobs(id),
      at timestamptz not null default now(),
      text text not null
    )$f$, job_id_type);
end $$;

create index if not exists repair_job_parts_job_idx on public.repair_job_parts (repair_job_id);
create index if not exists repair_job_history_job_idx on public.repair_job_history (repair_job_id, at);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.job_no_counters (
  prefix text primary key,
  last_no integer not null default 0
);

-- ---------------------------------------------------------------------------
-- 3. Security: RLS on everywhere, no direct access for anon/authenticated
-- ---------------------------------------------------------------------------
alter table public.repair_jobs enable row level security;
alter table public.staff enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.repair_job_parts enable row level security;
alter table public.repair_job_history enable row level security;
alter table public.app_settings enable row level security;
alter table public.job_no_counters enable row level security;

revoke all on public.repair_jobs, public.staff, public.inventory_items, public.inventory_transactions,
  public.repair_job_parts, public.repair_job_history, public.app_settings, public.job_no_counters
  from anon, authenticated;
grant all on public.repair_jobs, public.staff, public.inventory_items, public.inventory_transactions,
  public.repair_job_parts, public.repair_job_history, public.app_settings, public.job_no_counters
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Transactional RPCs (one transaction each, rows locked with FOR UPDATE)
--    Errors are raised in Thai and shown to the user as-is.
-- ---------------------------------------------------------------------------

create or replace function public.app_create_job(p_request_id text, p_job jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_existing record;
  v_prefix text := 'JOB-' || (extract(year from now() at time zone 'Asia/Bangkok')::int + 543) || '-'
                   || to_char(now() at time zone 'Asia/Bangkok', 'MM') || '-';
  v_no integer;
  v_id repair_jobs.id%type;
  v_job_no text;
begin
  select id::text as id, job_no into v_existing from repair_jobs where request_id = p_request_id;
  if found then
    return jsonb_build_object('id', v_existing.id, 'jobNo', v_existing.job_no);
  end if;

  insert into job_no_counters as c (prefix, last_no)
  values (v_prefix, coalesce((select max(substring(job_no from length(v_prefix) + 1)::int)
                              from repair_jobs where job_no like v_prefix || '%'
                                and substring(job_no from length(v_prefix) + 1) ~ '^\d+$'), 0) + 1)
  on conflict (prefix) do update set last_no = c.last_no + 1
  returning last_no into v_no;

  v_job_no := v_prefix || lpad(v_no::text, 4, '0');
  insert into repair_jobs (job_no, status, request_id, payload)
  values (v_job_no, coalesce(p_job->>'status', 'received'), p_request_id, p_job)
  returning id into v_id;

  insert into repair_job_history (repair_job_id, text) values (v_id, 'สร้างใบงาน');
  return jsonb_build_object('id', v_id::text, 'jobNo', v_job_no);
end $$;

create or replace function public.app_update_job(p_job_id text, p_patch jsonb, p_history text)
returns void language plpgsql set search_path = public as $$
declare v_job record;
begin
  select id, status into v_job from repair_jobs where id::text = p_job_id for update;
  if not found then raise exception 'ไม่พบใบงาน'; end if;

  update repair_jobs
  set payload = coalesce(payload::jsonb, '{}'::jsonb) || (p_patch - 'parts' - 'history' - 'id' - 'jobNo'),
      status = coalesce(p_patch->>'status', status),
      updated_at = now()
  where id = v_job.id;

  insert into repair_job_history (repair_job_id, text) values (v_job.id, p_history);
end $$;

create or replace function public.app_issue_job_part(
  p_request_id text, p_job_id text, p_item_id text, p_qty numeric, p_note text)
returns void language plpgsql set search_path = public as $$
declare
  v_job record;
  v_item record;
  v_jp_id uuid;
begin
  if exists (select 1 from inventory_transactions where request_id = p_request_id) then
    return; -- same click already processed
  end if;
  if p_qty is null or p_qty <= 0 then raise exception 'จำนวนต้องมากกว่า 0'; end if;

  select id, status, job_no into v_job from repair_jobs where id::text = p_job_id for update;
  if not found then raise exception 'ไม่พบใบงาน'; end if;
  if v_job.status in ('delivered', 'cancelled') then
    raise exception 'ใบงานนี้ปิดแล้ว ไม่สามารถเบิกอะไหล่ได้';
  end if;

  select * into v_item from inventory_items where id::text = p_item_id for update;
  if not found then raise exception 'ไม่พบอะไหล่'; end if;
  if coalesce(v_item.quantity, 0) < p_qty then
    raise exception 'สต๊อกไม่พอ (คงเหลือ % %)', coalesce(v_item.quantity, 0), coalesce(v_item.unit, '');
  end if;

  update inventory_items set quantity = quantity - p_qty, updated_at = now() where id = v_item.id;

  insert into repair_job_parts (repair_job_id, item_id, part_code, part_name, unit, qty, unit_cost, unit_price, note)
  values (v_job.id, v_item.id, coalesce(v_item.item_code, ''), coalesce(v_item.name, ''), coalesce(v_item.unit, ''),
          p_qty, v_item.cost_price, v_item.sell_price, coalesce(p_note, ''))
  returning id into v_jp_id;

  insert into inventory_transactions (item_id, repair_job_id, job_part_id, transaction_type, quantity, note, request_id)
  values (v_item.id, v_job.id, v_jp_id, 'job_issue', -p_qty, coalesce(p_note, ''), p_request_id);

  insert into repair_job_history (repair_job_id, text)
  values (v_job.id, format('เบิก %s %s %s', v_item.name, trim_scale(p_qty), v_item.unit));
end $$;

create or replace function public.app_cancel_job_part(p_request_id text, p_job_part_id text)
returns void language plpgsql set search_path = public as $$
declare v_jp record;
begin
  if exists (select 1 from inventory_transactions where request_id = p_request_id) then
    return;
  end if;

  select * into v_jp from repair_job_parts where id::text = p_job_part_id for update;
  if not found then raise exception 'ไม่พบรายการ'; end if;
  if v_jp.cancelled_at is not null then raise exception 'รายการนี้ถูกยกเลิกไปแล้ว'; end if;

  update repair_job_parts set cancelled_at = now() where id = v_jp.id;
  update inventory_items set quantity = quantity + v_jp.qty, updated_at = now() where id = v_jp.item_id;

  insert into inventory_transactions (item_id, repair_job_id, job_part_id, transaction_type, quantity, note, request_id)
  values (v_jp.item_id, v_jp.repair_job_id, v_jp.id, 'job_return', v_jp.qty, 'ยกเลิกรายการในใบงาน', p_request_id);

  insert into repair_job_history (repair_job_id, text)
  values (v_jp.repair_job_id, format('ยกเลิก %s %s %s คืนสต๊อก', v_jp.part_name, trim_scale(v_jp.qty), v_jp.unit));
end $$;

create or replace function public.app_record_movement(
  p_request_id text, p_item_id text, p_type text, p_qty numeric, p_note text)
returns void language plpgsql set search_path = public as $$
declare
  v_item record;
  v_delta numeric;
begin
  if exists (select 1 from inventory_transactions where request_id = p_request_id) then
    return;
  end if;
  if p_type not in ('in', 'out', 'adjust') then raise exception 'ประเภทรายการไม่ถูกต้อง'; end if;
  if p_type <> 'adjust' and (p_qty is null or p_qty <= 0) then raise exception 'จำนวนต้องมากกว่า 0'; end if;
  if p_type = 'adjust' and (p_qty is null or p_qty = 0) then raise exception 'จำนวนที่ปรับต้องไม่เป็น 0'; end if;

  v_delta := case when p_type = 'out' then -p_qty else p_qty end;

  select * into v_item from inventory_items where id::text = p_item_id for update;
  if not found then raise exception 'ไม่พบอะไหล่'; end if;
  if coalesce(v_item.quantity, 0) + v_delta < 0 then raise exception 'จำนวนคงเหลือติดลบไม่ได้'; end if;

  update inventory_items set quantity = coalesce(quantity, 0) + v_delta, updated_at = now() where id = v_item.id;
  insert into inventory_transactions (item_id, transaction_type, quantity, note, request_id)
  values (v_item.id, p_type, v_delta, coalesce(p_note, ''), p_request_id);
end $$;

create or replace function public.app_void_movement(p_request_id text, p_transaction_id text)
returns void language plpgsql set search_path = public as $$
declare
  v_tx record;
  v_item record;
begin
  if exists (select 1 from inventory_transactions where request_id = p_request_id) then
    return;
  end if;

  select * into v_tx from inventory_transactions where id::text = p_transaction_id for update;
  if not found then raise exception 'ไม่พบรายการ'; end if;
  if v_tx.voided_at is not null then raise exception 'รายการนี้ถูกยกเลิกไปแล้ว'; end if;
  if v_tx.repair_job_id is not null then raise exception 'รายการที่ผูกกับใบงาน ให้ยกเลิกจากหน้าใบงาน'; end if;
  if v_tx.transaction_type not in ('in', 'out', 'adjust') then raise exception 'รายการนี้ยกเลิกไม่ได้'; end if;

  select * into v_item from inventory_items where id = v_tx.item_id for update;
  if coalesce(v_item.quantity, 0) - v_tx.quantity < 0 then raise exception 'ยกเลิกแล้วคงเหลือจะติดลบ'; end if;

  update inventory_items set quantity = coalesce(quantity, 0) - v_tx.quantity, updated_at = now() where id = v_item.id;
  update inventory_transactions set voided_at = now() where id = v_tx.id;
  insert into inventory_transactions (item_id, transaction_type, quantity, note, request_id, reversal_of)
  values (v_item.id, 'void', -v_tx.quantity, 'ยกเลิกรายการที่บันทึกผิด', p_request_id, v_tx.id::text);
end $$;

revoke all on function
  public.app_create_job(text, jsonb),
  public.app_update_job(text, jsonb, text),
  public.app_issue_job_part(text, text, text, numeric, text),
  public.app_cancel_job_part(text, text),
  public.app_record_movement(text, text, text, numeric, text),
  public.app_void_movement(text, text)
  from public, anon, authenticated;
grant execute on function
  public.app_create_job(text, jsonb),
  public.app_update_job(text, jsonb, text),
  public.app_issue_job_part(text, text, text, numeric, text),
  public.app_cancel_job_part(text, text),
  public.app_record_movement(text, text, text, numeric, text),
  public.app_void_movement(text, text)
  to service_role;

-- Make the new objects visible to the API immediately.
notify pgrst, 'reload schema';

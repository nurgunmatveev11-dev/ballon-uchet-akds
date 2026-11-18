-- Apply after four-roles.sql. Existing cylinder, batch and issue data is preserved.
-- Supabase Auth must require email confirmation and the Confirm signup template
-- must contain {{ .Token }} so the email delivers a code for the in-app form.

alter table public.profiles add column if not exists requested_role public.app_role;
alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.profiles add column if not exists last_app_login_at timestamptz;
update public.profiles set role = 'operator' where role = 'observer';
update public.profiles set requested_role = role where requested_role is null;
alter table public.profiles alter column role set default 'operator';
alter table public.profiles alter column active set default false;

create or replace function public.create_signup_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
declare requested text := new.raw_user_meta_data->>'requested_role';
begin
  if requested is null or requested not in ('akds_head','skk_head','warehouseman','operator') then requested := 'operator'; end if;
  insert into public.profiles(id,full_name,role,requested_role,active)
  values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Новый сотрудник'),100),'operator',requested::public.app_role,false)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_staff_signup on auth.users;
create trigger on_staff_signup after insert on auth.users
for each row execute function public.create_signup_profile();

-- Inactive and unapproved users cannot read operational tables, even with a valid Auth token.
drop policy if exists "authenticated can read registry" on public.cylinders;
create policy "active staff read cylinders" on public.cylinders for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read batches" on public.batches;
create policy "active staff read batches" on public.batches for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read batch membership" on public.batch_cylinders;
create policy "active staff read batch membership" on public.batch_cylinders for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read organizations" on public.organizations;
create policy "active staff read organizations" on public.organizations for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read issue history" on public.issue_protocols;
create policy "active staff read issues" on public.issue_protocols for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read issue items" on public.issue_items;
create policy "active staff read issue items" on public.issue_items for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read returns" on public.returns;
create policy "active staff read returns" on public.returns for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "authenticated can read movement history" on public.cylinder_movements;
create policy "active staff read movements" on public.cylinder_movements for select to authenticated using (public.current_app_role() is not null);
drop policy if exists "staff reads batch documents" on storage.objects;
drop policy if exists "quality roles upload batch documents" on storage.objects;
drop policy if exists "quality roles replace batch documents" on storage.objects;
drop policy if exists "staff uploads batch documents" on storage.objects;
create policy "active staff read batch documents" on storage.objects for select to authenticated
using (bucket_id = 'batch-documents' and public.current_app_role() is not null);
create policy "active staff upload batch documents" on storage.objects for insert to authenticated
with check (bucket_id = 'batch-documents' and public.has_any_role(array['warehouseman','akds_head','skk_head']::public.app_role[]));

drop function if exists public.list_staff_profiles();
create function public.list_staff_profiles()
returns table(id uuid,email text,full_name text,role public.app_role,requested_role public.app_role,active boolean,created_at timestamptz,email_confirmed_at timestamptz,last_app_login_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() is distinct from 'akds_head' then raise exception 'Only the AKDS head may view accounts'; end if;
  return query
    select p.id,u.email::text,p.full_name,p.role,p.requested_role,p.active,p.created_at,u.email_confirmed_at,p.last_app_login_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.id <> auth.uid() and p.deactivated_at is null
    order by p.active, p.created_at desc;
end $$;
revoke all on function public.list_staff_profiles() from public;
grant execute on function public.list_staff_profiles() to authenticated;

create or replace function public.record_app_login()
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() is null then raise exception 'Active employee account required'; end if;
  update public.profiles set last_app_login_at = now() where id = auth.uid() and active;
end $$;
revoke all on function public.record_app_login() from public;
grant execute on function public.record_app_login() to authenticated;

create or replace function public.assign_staff_role(target_id uuid,new_role public.app_role)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() is distinct from 'akds_head' then raise exception 'Only the AKDS head may assign roles'; end if;
  if target_id = auth.uid() then raise exception 'You cannot change your own role'; end if;
  if not coalesce(new_role in ('akds_head','skk_head','warehouseman','operator'),false) then raise exception 'Unknown role'; end if;
  if not exists(select 1 from auth.users u where u.id = target_id and u.email_confirmed_at is not null) then
    raise exception 'Email must be confirmed before approval';
  end if;
  update public.profiles set role = new_role, active = true
  where id = target_id and deactivated_at is null;
  if not found then raise exception 'Employee not found'; end if;
end $$;
revoke all on function public.assign_staff_role(uuid,public.app_role) from public;
grant execute on function public.assign_staff_role(uuid,public.app_role) to authenticated;

create or replace function public.deactivate_staff_account(target_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() is distinct from 'akds_head' then raise exception 'Only the AKDS head may remove access'; end if;
  if target_id = auth.uid() then raise exception 'You cannot remove your own access'; end if;
  update public.profiles set active = false, deactivated_at = now() where id = target_id and deactivated_at is null;
  if not found then raise exception 'Employee not found'; end if;
end $$;
revoke all on function public.deactivate_staff_account(uuid) from public;
grant execute on function public.deactivate_staff_account(uuid) to authenticated;


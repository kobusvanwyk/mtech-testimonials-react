-- User roles: "admin" (full access) and "finder" (Ask AI over published
-- testimonials, read only). Run once in the Supabase SQL Editor.
--
-- Safe order: every user that exists right now becomes an admin FIRST, so
-- nobody already signed in loses access when the stricter rules switch on.
-- Users created later get no row, which means "finder" (least access) until
-- an admin row is added for them.
--
-- The whole script runs as one transaction: if any statement fails, nothing
-- changes.

begin;

-- 1. Roles table -------------------------------------------------------------
create table if not exists public.user_roles (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    role       text not null check (role in ('admin', 'finder')),
    created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- 2. Every existing user becomes an admin -----------------------------------
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users
on conflict (user_id) do nothing;

-- 3. is_admin(): true for a signed-in user with the admin role ---------------
-- security definer so it can read user_roles from inside other tables' rules
-- without those rules recursing.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 4. Clear the old "any signed-in user may do anything" rules ----------------
-- Drops every existing policy on these tables, whatever it was called, so no
-- permissive leftover keeps giving finders write access. They are recreated
-- below.
do $$
declare p record;
begin
    for p in
        select schemaname, tablename, policyname from pg_policies
        where schemaname = 'public'
          and tablename in ('testimonials', 'conditions', 'products', 'site_settings', 'user_roles')
    loop
        execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    end loop;
end $$;

-- 5. Recreate the rules -------------------------------------------------------

-- user_roles: everyone may read their own row (the app and the AI functions
-- use it); only admins may see or change all rows.
create policy "Read own role" on public.user_roles
    for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins manage roles" on public.user_roles
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- testimonials
create policy "Public can submit testimonials" on public.testimonials
    for insert to anon, authenticated with check (status = 'pending');
create policy "Anyone can read published testimonials" on public.testimonials
    for select to anon, authenticated using (status = 'approved');
create policy "Admins can read all testimonials" on public.testimonials
    for select to authenticated using (public.is_admin());
create policy "Admins can update testimonials" on public.testimonials
    for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete testimonials" on public.testimonials
    for delete to authenticated using (public.is_admin());

-- conditions, products, site_settings: anyone reads, admins change
create policy "Public can read conditions" on public.conditions
    for select using (true);
create policy "Admins manage conditions" on public.conditions
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read products" on public.products
    for select using (true);
create policy "Admins manage products" on public.products
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read settings" on public.site_settings
    for select using (true);
create policy "Admins manage settings" on public.site_settings
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. Image storage: deleting or replacing images is admin only ---------------
-- (Uploading stays open: the public submission form uploads photos.)
drop policy if exists "Authenticated users can delete testimonial images" on storage.objects;
drop policy if exists "Admins can delete testimonial images" on storage.objects;
drop policy if exists "Admins can update testimonial images" on storage.objects;
create policy "Admins can delete testimonial images" on storage.objects
    for delete to authenticated using (bucket_id = 'testimonial-images' and public.is_admin());
create policy "Admins can update testimonial images" on storage.objects
    for update to authenticated using (bucket_id = 'testimonial-images' and public.is_admin());

commit;

-- 7. Check (run after): every policy on the affected tables, for a quick read.
-- select tablename, policyname, cmd, roles from pg_policies
-- where schemaname in ('public', 'storage')
--   and tablename in ('testimonials','conditions','products','site_settings','user_roles','objects')
-- order by tablename, cmd;

-- Making a user a finder (after creating them under Authentication > Users):
-- insert into public.user_roles (user_id, role)
-- select id, 'finder' from auth.users where email = 'her@example.com'
-- on conflict (user_id) do update set role = excluded.role;

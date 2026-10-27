-- Auth and Storage tables are created by the actual services' own migrations.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password :'local_password';
grant anon,authenticated,service_role to authenticator;
create role supabase_auth_admin login password :'local_password';
create schema auth authorization supabase_auth_admin;
alter role supabase_auth_admin set search_path=auth,public,extensions;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')$$;
grant usage on schema public,auth,extensions to anon,authenticated,service_role,authenticator,supabase_auth_admin;
grant all on schema auth to supabase_auth_admin;
alter default privileges in schema public grant all on tables to postgres,service_role;
alter default privileges in schema auth grant all on tables to postgres;

alter function auth.uid() owner to supabase_auth_admin;
alter function auth.role() owner to supabase_auth_admin;

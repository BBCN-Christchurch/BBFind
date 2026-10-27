-- Only current public content and a single proposed change are retained.
-- No audit log or revision-history system is created.
create table public.organisations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null check(length(name) between 3 and 150), contact_name text not null check(length(contact_name) between 1 and 100),
 email text not null, phone text not null check(length(phone) between 1 and 80), suspended boolean not null default false,
 deletion_requested_at timestamptz, created_at timestamptz not null default now()
);
create table public.administrator_roles(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.categories(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 2 and 150),parent_id uuid references public.categories(id),active boolean not null default true);
create table public.locations(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 2 and 150),active boolean not null default true);
create table public.listings (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations(id) on delete cascade,
 published jsonb, proposed jsonb not null,
 status text not null default 'draft' check(status in ('draft','pending_review','changes_requested','rejected','published','archived','suspended')),
 review_note text check(length(review_note)<=1000), featured boolean not null default false,verified boolean not null default false,
 updated_at timestamptz not null default now()
);
create index listings_org_idx on public.listings(organisation_id);
create index listings_status_idx on public.listings(status,updated_at);
create table public.listing_images (
 id uuid primary key,listing_id uuid not null references public.listings(id) on delete cascade,
 thumbnail_path text not null unique,detail_path text not null unique,large_path text not null unique,
 byte_size integer not null check(byte_size>0), replaces_id uuid references public.listing_images(id) on delete set null,published jsonb,proposed jsonb,
 status text not null default 'pending_review' check(status in ('pending_review','approved','rejected')),
 note text check(length(note)<=1000),created_at timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images(listing_id);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),organisation_id uuid references public.organisations(id) on delete cascade,
 event text not null,listing_id uuid references public.listings(id) on delete cascade,
 created_at timestamptz not null default now(), attempts integer not null default 0,last_error text,
 sent_at timestamptz
);

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.administrator_roles a join auth.users u on u.id=a.user_id where a.user_id=auth.uid() and u.email_confirmed_at is not null)
$$;
create function public.own_organisation() returns uuid language sql stable security definer set search_path='' as $$
 select o.id from public.organisations o join auth.users u on u.id=o.owner_id where o.owner_id=auth.uid() and not o.suspended and u.email_confirmed_at is not null
$$;
create function public.require_admin() returns void language plpgsql stable security definer set search_path='' as $$
 begin if not public.is_admin() then raise exception 'BBCN administrator access required' using errcode='42501';end if;end
$$;
create function public.can_manage_listing(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists(select 1 from public.listings l where l.id=target and l.organisation_id=public.own_organisation())
$$;
create function public.register_organisation() returns trigger language plpgsql security definer set search_path='' as $$
 begin
  insert into public.organisations(owner_id,name,contact_name,email,phone) values(new.id,
   coalesce(nullif(trim(new.raw_user_meta_data->>'organisation_name'),''),'New organisation'),
   coalesce(nullif(trim(new.raw_user_meta_data->>'contact_name'),''),'Not supplied'),new.email,
   coalesce(nullif(trim(new.raw_user_meta_data->>'phone'),''),'Not supplied'));
  return new;
 end
$$;
create trigger register_organisation after insert on auth.users for each row execute function public.register_organisation();
create function public.sync_registration_email() returns trigger language plpgsql security definer set search_path='' as $$
 begin update public.organisations set email=new.email where owner_id=new.id;return new;end
$$;
create trigger registration_email_updated after update of email on auth.users for each row execute function public.sync_registration_email();

alter table public.organisations enable row level security;
alter table public.administrator_roles enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.notifications enable row level security;
create policy organisation_read on public.organisations for select to authenticated using(owner_id=auth.uid() or public.is_admin());
create policy category_read on public.categories for select to anon,authenticated using(active or public.is_admin());
create policy location_read on public.locations for select to anon,authenticated using(active or public.is_admin());
create policy listing_read on public.listings for select to authenticated using(public.can_manage_listing(id));
create policy image_read on public.listing_images for select to authenticated using(public.can_manage_listing(listing_id));
-- Mutations use narrowly authorised functions. No client role has direct writes.
revoke all on public.organisations,public.administrator_roles,public.categories,public.locations,public.listings,public.listing_images,public.notifications from anon,authenticated;
grant select on public.organisations,public.listings,public.listing_images to authenticated;
grant select on public.categories,public.locations to anon,authenticated;
grant all on public.organisations,public.administrator_roles,public.categories,public.locations,public.listings,public.listing_images,public.notifications to service_role;

create function public.valid_listing(c jsonb) returns boolean language plpgsql stable set search_path='' as $$
 declare k text; v jsonb;
 begin
 if c is null or jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>50000 then return false;end if;
 if not (c ?& array['name','summary','description','type','categories','suburb','address','website','publicEmail','publicPhone','publicContact','socialLinks','times','ageGroups','cost','accessibility','capacity','roomType','kitchen','accessible','outdoor','wifi','parking','av','toilets','facilities','suitableFor','availability','bookingUrl','price','spaces']) then return false;end if;
 for k,v in select * from jsonb_each(c) loop
  if not(k=any(array['name','summary','description','type','categories','suburb','address','website','publicEmail','publicPhone','publicContact','socialLinks','times','ageGroups','cost','accessibility','capacity','roomType','kitchen','accessible','outdoor','wifi','parking','av','toilets','facilities','suitableFor','availability','bookingUrl','price','spaces'])) then return false;end if;
  if k=any(array['kitchen','accessible','outdoor','wifi','parking','av','toilets']) then
   if jsonb_typeof(v)<>'boolean' then return false;end if;
  elsif k=any(array['capacity','price']) then
   if jsonb_typeof(v)<>'number' or (v::text)::numeric<0 or (v::text)::numeric>100000 then return false;end if;
   if k='capacity' and trunc((v::text)::numeric)<>(v::text)::numeric then return false;end if;
  elsif k='categories' then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v) not between 1 and 10 then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string') then return false;end if;
   if exists(select 1 from jsonb_array_elements_text(v) x where not exists(select 1 from public.categories cat where cat.name=x and cat.active)) then return false;end if;
  else
   if jsonb_typeof(v)<>'string' or length(c->>k)>10000 then return false;end if;
  end if;
 end loop;
 if length(trim(c->>'name')) not between 3 and 150 or length(trim(c->>'summary')) not between 10 and 220 or length(trim(c->>'description')) not between 20 and 10000 then return false;end if;
 if c->>'type' not in('organisation','programme','activity','service','business','venue') then return false;end if;
 if not exists(select 1 from public.locations l where l.name=c->>'suburb' and l.active) then return false;end if;
 if length(c->>'address')>300 or length(c->>'publicEmail')>254 or length(c->>'publicPhone')>80 or length(c->>'publicContact')>100 or length(c->>'socialLinks')>2000 then return false;end if;
 if c->>'publicEmail'<>'' and c->>'publicEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false;end if;
 foreach k in array array['website','bookingUrl'] loop
  if length(c->>k)>1000 or (c->>k<>'' and c->>k !~* '^https?://[^[:space:]]+$') then return false;end if;
 end loop;
 if c->>'socialLinks'<>'' and exists(select 1 from regexp_split_to_table(c->>'socialLinks',E'\n') s where s !~* '^https?://[^[:space:]]+$') then return false;end if;
 return true;
 exception when others then return false;
 end
$$;
create function public.save_listing(listing_id uuid,content jsonb,submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
 declare target uuid; current_row public.listings;org uuid;
 begin
 if not public.valid_listing(content) then raise exception 'Check the listing fields, categories and location.';end if;
 if listing_id is null then
  org:=public.own_organisation();if org is null then raise exception 'A verified, active organisation account is required' using errcode='42501';end if;
  if (select count(*) from public.listings where organisation_id=org)>=100 then raise exception 'Organisation listing limit reached. Contact BBCN.';end if;
  insert into public.listings(organisation_id,proposed,status) values(org,content,case when submit then 'pending_review' else 'draft' end) returning id into target;
 else
  select * into current_row from public.listings l where l.id=listing_id for update;
  if not found or not public.can_manage_listing(listing_id) then raise exception 'You cannot manage this listing' using errcode='42501';end if;
  if current_row.status in('archived','suspended') then raise exception 'BBCN must restore this listing first';end if;
  if current_row.status='pending_review' and not public.is_admin() then raise exception 'Wait for BBCN to review this submission';end if;
  update public.listings l set proposed=content,status=case when submit then 'pending_review' else 'draft' end,review_note=null,updated_at=now() where l.id=listing_id;target:=listing_id;
 end if;
 if submit then insert into public.notifications(organisation_id,event,listing_id) select l.organisation_id,'listing_submitted',target from public.listings l where l.id=target;end if;
 return target;
 end
$$;
create function public.directory_search(offset_count integer default 0,page_size integer default 200) returns table(id uuid,organisation_name text,data jsonb,featured boolean,verified boolean) language sql stable security definer set search_path='' as $$
 select l.id,(select p.published->>'name' from public.listings p where p.organisation_id=l.organisation_id and p.published->>'type'='organisation' and p.published is not null and p.status not in('archived','suspended') order by p.id limit 1),l.published,l.featured,l.verified
 from public.listings l join public.organisations o on o.id=l.organisation_id
 where l.published is not null and l.status not in('archived','suspended') and not o.suspended
 order by l.featured desc,l.id limit least(greatest(page_size,1),200) offset greatest(offset_count,0)
$$;
create function public.review_listing(listing_id uuid,decision text,note text,expected_content jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare row public.listings;
 begin
 perform public.require_admin();if length(note)>1000 then raise exception 'Review note too long';end if;
 select * into row from public.listings l where l.id=listing_id for update;
 if not found or row.status<>'pending_review' then raise exception 'This listing is not awaiting review';end if;
 if row.proposed is distinct from expected_content then raise exception 'The submission changed. Reload before reviewing.';end if;
 if decision='approve' then
  if not public.valid_listing(row.proposed) then raise exception 'The proposed content is invalid';end if;
  update public.listings l set published=proposed,status='published',review_note=null,updated_at=now() where l.id=listing_id;
 elsif decision in('reject','changes_requested') then
  if length(trim(note))=0 then raise exception 'Explain your decision in the private review note';end if;
  update public.listings l set status=case when decision='reject' then 'rejected' else 'changes_requested' end,review_note=note,updated_at=now() where l.id=listing_id;
 else raise exception 'Invalid moderation decision';end if;
 insert into public.notifications(organisation_id,event,listing_id) values(row.organisation_id,case when decision='approve' then 'listing_approved' else 'listing_'||decision end,listing_id);
 end
$$;
create function public.set_listing_flags(listing_id uuid,feature boolean,verify boolean) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_admin();update public.listings l set featured=feature,verified=verify where l.id=listing_id;end
$$;
create function public.set_listing_state(listing_id uuid,new_state text) returns void language plpgsql security definer set search_path='' as $$
 begin
 perform public.require_admin();
 if new_state='unpublish' then update public.listings l set published=null,status='draft',updated_at=now() where l.id=listing_id;
 elsif new_state in('archive','suspend') then update public.listings l set status=case when new_state='archive' then 'archived' else 'suspended' end,updated_at=now() where l.id=listing_id;
 elsif new_state='restore' then update public.listings l set status=case when published is null then 'draft' else 'published' end,updated_at=now() where l.id=listing_id and status in('archived','suspended');
 else raise exception 'Invalid state';end if;
 end
$$;
create function public.delete_listing(listing_id uuid) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_admin();delete from public.listings l where l.id=listing_id;end
$$;
create function public.set_organisation_suspended(organisation_id uuid,suspend boolean) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.require_admin();update public.organisations o set suspended=suspend where o.id=organisation_id;end
$$;
create function public.update_account(account_name text,contact_name text,contact_phone text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if public.own_organisation() is null then raise exception 'Verified active account required' using errcode='42501';end if;
 update public.organisations o set name=account_name,contact_name=update_account.contact_name,phone=contact_phone where o.id=public.own_organisation();
 end
$$;
create function public.request_deletion() returns void language plpgsql security definer set search_path='' as $$
 declare org uuid;
 begin select id into org from public.organisations where owner_id=auth.uid();if org is null then raise exception 'Sign in first';end if;
 update public.organisations set deletion_requested_at=coalesce(deletion_requested_at,now()) where id=org;
 insert into public.notifications(organisation_id,event) values(org,'deletion_requested');end
$$;
create function public.export_account() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare org uuid;
 begin select id into org from public.organisations where owner_id=auth.uid();if org is null then raise exception 'Sign in first';end if;
 return jsonb_build_object('account',(select to_jsonb(o) from public.organisations o where o.id=org),'listings',coalesce((select jsonb_agg(to_jsonb(l)) from public.listings l where l.organisation_id=org),'[]'::jsonb),'images',coalesce((select jsonb_agg(to_jsonb(i)) from public.listing_images i join public.listings l on l.id=i.listing_id where l.organisation_id=org),'[]'::jsonb));end
$$;
create function public.admin_delete_account(organisation_id uuid) returns void language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin perform public.require_admin();select owner_id into target from public.organisations o where o.id=organisation_id and deletion_requested_at is not null;
 if target is null then raise exception 'An organisation deletion request is required';end if;
 if exists(select 1 from public.administrator_roles where user_id=target) then raise exception 'Remove administrator access separately before deleting this account';end if;
 delete from auth.users where id=target;end
$$;

create function public.valid_image_metadata(m jsonb) returns boolean language plpgsql immutable set search_path='' as $$
 begin return coalesce(jsonb_typeof(m)='object' and (m ?& array['caption','alt','position','primary','remove']) and (select count(*) from jsonb_object_keys(m))=5
 and jsonb_typeof(m->'caption')='string' and length(m->>'caption')<=300 and jsonb_typeof(m->'alt')='string' and length(trim(m->>'alt')) between 1 and 300
 and jsonb_typeof(m->'position')='number' and (m->>'position')::numeric between 0 and 100 and trunc((m->>'position')::numeric)=(m->>'position')::numeric
 and jsonb_typeof(m->'primary')='boolean' and jsonb_typeof(m->'remove')='boolean',false);exception when others then return false;end
$$;
create function public.propose_image(image_id uuid,metadata jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin select listing_id into target from public.listing_images i where i.id=image_id;
 if target is null or not public.can_manage_listing(target) then raise exception 'You cannot manage this image' using errcode='42501';end if;
 if not public.valid_image_metadata(metadata) then raise exception 'Check caption, alt text and order';end if;
 update public.listing_images i set proposed=metadata,status='pending_review',note=null where i.id=image_id;
 end
$$;
create function public.review_image(image_id uuid,decision text,note text,expected_metadata jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare img public.listing_images;
 begin perform public.require_admin();if length(note)>1000 then raise exception 'Review note too long';end if;
 select * into img from public.listing_images i where i.id=image_id;
 if not found then raise exception 'Image no longer exists';end if;
 -- Lock the parent before image rows to avoid deadlocks between replacements.
 perform 1 from public.listings where id=img.listing_id for update;
 select * into img from public.listing_images i where i.id=image_id for update;
 if not found or img.status<>'pending_review' then raise exception 'This image is not awaiting review';end if;
 if img.proposed is distinct from expected_metadata then raise exception 'The image submission changed. Reload before reviewing.';end if;
 if decision='approve' then
  if not public.valid_image_metadata(img.proposed) then raise exception 'Invalid image metadata';end if;
  if (img.proposed->>'remove')::boolean then delete from public.listing_images where id=image_id;
  else
   if (img.proposed->>'primary')::boolean then update public.listing_images i set published=jsonb_set(published,'{primary}','false') where i.listing_id=img.listing_id and published is not null;end if;
   if img.replaces_id is not null then delete from public.listing_images where id=img.replaces_id;end if;
   update public.listing_images i set published=proposed,proposed=null,status='approved',note=null,replaces_id=null where i.id=image_id;
  end if;
  if not exists(select 1 from public.listing_images where listing_id=img.listing_id and published->>'primary'='true') then
   update public.listing_images set published=jsonb_set(published,'{primary}','true') where id=(select id from public.listing_images where listing_id=img.listing_id and published is not null order by (published->>'position')::int,id limit 1);
  end if;
 elsif decision='reject' then update public.listing_images i set status='rejected',note=coalesce(nullif(review_image.note,''),'Please choose another image or update the proposed information.') where i.id=image_id;
 else raise exception 'Invalid image decision';end if;
 end
$$;
create function public.directory_images(target_listing uuid) returns table(id uuid,listing_id uuid,published jsonb,proposed jsonb,status text,note text,thumbnail_path text,detail_path text,large_path text) language sql stable security definer set search_path='' as $$
 select i.id,i.listing_id,i.published,null::jsonb,'approved'::text,null::text,i.thumbnail_path,i.detail_path,i.large_path
 from public.listing_images i join public.listings l on l.id=i.listing_id join public.organisations o on o.id=l.organisation_id
 where l.id=target_listing and l.published is not null and l.status not in('archived','suspended') and not o.suspended and i.published is not null
 order by (i.published->>'primary')::boolean desc,(i.published->>'position')::integer,i.id
$$;
create function public.can_read_image(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.listing_images i join public.listings l on l.id=i.listing_id join public.organisations o on o.id=l.organisation_id
 where object_name in(i.thumbnail_path,i.detail_path,i.large_path)
 and (public.can_manage_listing(l.id) or (i.published is not null and l.published is not null and l.status not in('archived','suspended') and not o.suspended)))
$$;
-- Called by the trusted processor only after it independently decodes/re-encodes bytes.
create function public.register_processed_image(image_id uuid,target_listing uuid,actor uuid,metadata jsonb,bytes integer,format text,replacement uuid) returns void language plpgsql security definer set search_path='' as $$
 declare org uuid;
 begin
 select o.id into org from public.listings l join public.organisations o on o.id=l.organisation_id join auth.users u on u.id=actor
 where l.id=target_listing and not o.suspended and u.email_confirmed_at is not null and (o.owner_id=actor or exists(select 1 from public.administrator_roles where user_id=actor));
 if org is null then raise exception 'Verified listing owner required' using errcode='42501';end if;
 perform 1 from public.organisations where id=org for update;
 if format not in('png','jpg') or bytes<=0 or bytes>8*1024*1024 or not public.valid_image_metadata(metadata) then raise exception 'Invalid processed image';end if;
 if replacement is not null and not exists(select 1 from public.listing_images where id=replacement and listing_id=target_listing and published is not null) then raise exception 'Replacement must belong to this listing';end if;
 if (select count(*) from public.listing_images where listing_id=target_listing)>=(case when replacement is null then 12 else 13 end) then raise exception 'This listing has reached its image allowance';end if;
 if (select coalesce(sum(i.byte_size),0) from public.listing_images i join public.listings l on l.id=i.listing_id where l.organisation_id=org)+bytes>50*1024*1024 then raise exception 'Organisation image storage allowance reached';end if;
 insert into public.listing_images(id,listing_id,thumbnail_path,detail_path,large_path,byte_size,proposed,replaces_id) values(image_id,target_listing,image_id||'/thumb.'||format,image_id||'/detail.'||format,image_id||'/large.'||format,bytes,metadata,replacement);
 end
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('directory-images','directory-images',false,8388608,array['image/png','image/jpeg']) on conflict(id) do nothing;
create policy directory_media_read on storage.objects for select to anon,authenticated using(bucket_id='directory-images' and public.can_read_image(name));
-- No client upload, update, or delete policies. The trusted processor writes storage.

create function public.manage_taxonomy(table_name text,record_id uuid,record_name text,is_active boolean,parent_id uuid default null) returns void language plpgsql security definer set search_path='' as $$
 declare old_name text;
 begin perform public.require_admin();
 if table_name='categories' then
  if record_id is not null and parent_id is not null and exists(with recursive ancestors as(select id,c.parent_id from public.categories c where c.id=manage_taxonomy.parent_id union all select c.id,c.parent_id from public.categories c join ancestors a on c.id=a.parent_id) select 1 from ancestors where id=record_id) then raise exception 'Category hierarchy cannot contain a cycle';end if;
  if record_id is null then insert into public.categories(name,active,parent_id) values(record_name,is_active,parent_id);
  else
   select name into old_name from public.categories where id=record_id;
   update public.categories c set name=record_name,active=is_active,parent_id=manage_taxonomy.parent_id where c.id=record_id;
   if old_name<>record_name then
    update public.listings l set proposed=jsonb_set(l.proposed,'{categories}',(select jsonb_agg(case when x=old_name then record_name else x end) from jsonb_array_elements_text(l.proposed->'categories') x)) where l.proposed->'categories' ? old_name;
    update public.listings l set published=jsonb_set(l.published,'{categories}',(select jsonb_agg(case when x=old_name then record_name else x end) from jsonb_array_elements_text(l.published->'categories') x)) where l.published->'categories' ? old_name;
   end if;
  end if;
 elsif table_name='locations' then
  if record_id is null then insert into public.locations(name,active) values(record_name,is_active);
  else
   select name into old_name from public.locations where id=record_id;
   update public.locations l set name=record_name,active=is_active where l.id=record_id;
   update public.listings l set proposed=jsonb_set(l.proposed,'{suburb}',to_jsonb(record_name)) where l.proposed->>'suburb'=old_name;
   update public.listings l set published=jsonb_set(l.published,'{suburb}',to_jsonb(record_name)) where l.published->>'suburb'=old_name;
  end if;
 else raise exception 'Invalid taxonomy';end if;
 end
$$;

insert into public.categories(name) values ('Arts, Heritage and Culture'),('Churches and Faith Communities'),('Community Groups and Special Interests'),('Education and Learning'),('Health and Wellbeing'),('Health and Welfare Services'),('Local Businesses and Services'),('Recreation and Hobbies'),('Sports and Exercise'),('Children, Youth and Families'),('Older People and Seniors'),('Ethnic and Multicultural Communities'),('Government and Community Support'),('Schools and Early Childhood'),('Venues and Facilities');
insert into public.locations(name) values('Burnside'),('Bryndwr'),('Harewood'),('Bishopdale'),('Papanui'),('Fendalton'),('Ilam'),('Avonhead'),('Casebrook'),('Russley');
-- Explicit function permissions: PostgreSQL's default PUBLIC EXECUTE is removed.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.can_read_image(text) to anon,authenticated;
grant execute on function public.directory_search(integer,integer),public.directory_images(uuid) to anon,authenticated;
grant execute on function public.own_organisation(),public.can_manage_listing(uuid),public.save_listing(uuid,jsonb,boolean),public.review_listing(uuid,text,text,jsonb),public.set_listing_flags(uuid,boolean,boolean),public.set_listing_state(uuid,text),public.delete_listing(uuid),public.set_organisation_suspended(uuid,boolean),public.update_account(text,text,text),public.request_deletion(),public.export_account(),public.admin_delete_account(uuid),public.propose_image(uuid,jsonb),public.review_image(uuid,text,text,jsonb),public.manage_taxonomy(text,uuid,text,boolean,uuid) to authenticated;
grant execute on all functions in schema public to service_role;

-- Incomplete drafts remain private; submission and review retain full validation.
begin;
create function public.valid_draft(c jsonb) returns boolean language plpgsql stable set search_path='' as $$
 declare probe jsonb; k text;
 begin
 if c is null or jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>50000 then return false;end if;
 if c->>'type' is null or c->>'type' not in('organisation','programme','activity','service','business','venue','event') then return false;end if;
 if jsonb_typeof(c->'summary') is distinct from 'string' or length(c->>'summary')>220 or jsonb_typeof(c->'description') is distinct from 'string' or length(c->>'description')>10000 then return false;end if;
 foreach k in array array['eventStartDate','eventEndDate'] loop
  if c ? k then
   if jsonb_typeof(c->k)<>'string' then return false;end if;
   if c->>k<>'' and (c->>k !~ '^\d{4}-\d{2}-\d{2}$' or (c->>k)::date not between date '1900-01-01' and date '2100-12-31' or to_char((c->>k)::date,'YYYY-MM-DD')<>c->>k) then return false;end if;
  end if;
 end loop;
 probe:=c || '{"type":"venue","summary":"A private incomplete draft.","description":"A private draft awaiting completion before submission.","eventStartDate":"","eventEndDate":""}'::jsonb;
 return public.valid_listing(probe);
 exception when others then return false;
 end
$$;
revoke all on function public.valid_draft(jsonb) from public,anon,authenticated;
grant execute on function public.valid_draft(jsonb) to service_role;
create or replace function public.save_listing(listing_id uuid,content jsonb,submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
 declare target uuid; current_row public.listings;org uuid;
 begin
 -- Retired terms may be retained on their own listings, never newly selected.
 if listing_id is not null then
  select * into current_row from public.listings l where l.id=listing_id for update;
  if not found or not public.can_manage_listing(listing_id) then raise exception 'You cannot manage this listing' using errcode='42501';end if;
 end if;
 if (submit and not public.valid_listing(content)) or (not submit and not public.valid_draft(content)) then raise exception 'Check the listing fields, categories and location.';end if;
 if exists(select 1 from jsonb_array_elements_text(content->'categories') x join public.categories c on c.name=x
  where not c.active and not (coalesce(current_row.proposed->'categories','[]'::jsonb) ? x or coalesce(current_row.published->'categories','[]'::jsonb) ? x)) then raise exception 'Choose active categories for new selections';end if;
 if exists(select 1 from public.locations l where l.name=content->>'suburb' and not l.active)
  and content->>'suburb' is distinct from current_row.proposed->>'suburb'
  and content->>'suburb' is distinct from current_row.published->>'suburb' then raise exception 'Choose an active neighbourhood for new selections';end if;
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


-- Keep only the timestamp of the current photo submission, not a history.
alter table public.listing_images add column review_requested_at timestamptz;
update public.listing_images set review_requested_at=created_at where status='pending_review';
create function public.stamp_image_review_request() returns trigger language plpgsql set search_path='' as $$
 begin
 if new.status='pending_review' then
  if TG_OP='INSERT' then new.review_requested_at:=now();
  elsif old.status is distinct from 'pending_review' or new.proposed is distinct from old.proposed then new.review_requested_at:=now();
  end if;
 else new.review_requested_at:=null;
 end if;
 return new;
 end
$$;
revoke all on function public.stamp_image_review_request() from public,anon,authenticated;
create trigger image_review_request_time before insert or update on public.listing_images for each row execute function public.stamp_image_review_request();
notify pgrst, 'reload schema';
commit;

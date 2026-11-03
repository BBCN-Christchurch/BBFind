-- Additive event and age fields. Existing listings remain valid without them.
-- Retired taxonomy terms are retained safely; only their existing listings may keep them.
begin;
create or replace function public.valid_listing(c jsonb) returns boolean language plpgsql stable set search_path='' as $$
 declare k text; v jsonb;
 begin
 if c is null or jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>50000 then return false;end if;
 if not (c ?& array['name','summary','description','type','categories','suburb','address','website','publicEmail','publicPhone','publicContact','socialLinks','times','ageGroups','cost','accessibility','capacity','roomType','kitchen','accessible','outdoor','wifi','parking','av','toilets','facilities','suitableFor','availability','bookingUrl','price','spaces']) then return false;end if;
 for k,v in select * from jsonb_each(c) loop
  if not(k=any(array['name','summary','description','type','categories','suburb','address','website','publicEmail','publicPhone','publicContact','socialLinks','times','ageGroups','cost','accessibility','capacity','roomType','kitchen','accessible','outdoor','wifi','parking','av','toilets','facilities','suitableFor','availability','bookingUrl','price','spaces','suitableAges','eventStartDate','eventEndDate'])) then return false;end if;
  if k=any(array['kitchen','accessible','outdoor','wifi','parking','av','toilets']) then
   if jsonb_typeof(v)<>'boolean' then return false;end if;
  elsif k=any(array['capacity','price']) then
   if jsonb_typeof(v)<>'number' or (v::text)::numeric<0 or (v::text)::numeric>100000 then return false;end if;
   if k='capacity' and trunc((v::text)::numeric)<>(v::text)::numeric then return false;end if;
  elsif k='suitableAges' then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>7 then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string' or x#>>'{}' not in('0-5','5-12','13-20','Adult','Senior','Family','All')) then return false;end if;
   if (select count(distinct x) from jsonb_array_elements(v) x)<>jsonb_array_length(v) then return false;end if;
  elsif k='categories' then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v) not between 1 and 10 then return false;end if;
   if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string') then return false;end if;
   if exists(select 1 from jsonb_array_elements_text(v) x where not exists(select 1 from public.categories cat where cat.name=x)) then return false;end if;
  else
   if jsonb_typeof(v)<>'string' or length(c->>k)>10000 then return false;end if;
  end if;
 end loop;
 if length(trim(c->>'name')) not between 3 and 150 or length(trim(c->>'summary')) not between 10 and 220 or length(trim(c->>'description')) not between 20 and 10000 then return false;end if;
 if c->>'type' not in('organisation','programme','activity','service','business','venue','event') then return false;end if;
 if not exists(select 1 from public.locations l where l.name=c->>'suburb') then return false;end if;
 if length(c->>'address')>300 or length(c->>'publicEmail')>254 or length(c->>'publicPhone')>80 or length(c->>'publicContact')>100 or length(c->>'socialLinks')>2000 then return false;end if;
 if c->>'publicEmail'<>'' and c->>'publicEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false;end if;
 foreach k in array array['website','bookingUrl'] loop
  if length(c->>k)>1000 or (c->>k<>'' and c->>k !~* '^https?://[^[:space:]]+$') then return false;end if;
 end loop;
 if c->>'socialLinks'<>'' and exists(select 1 from regexp_split_to_table(c->>'socialLinks',E'\n') s where s !~* '^https?://[^[:space:]]+$') then return false;end if;
 foreach k in array array['eventStartDate','eventEndDate'] loop
  if c ? k then
   if jsonb_typeof(c->k)<>'string' then return false;end if;
   if c->>k<>'' and (c->>k !~ '^\d{4}-\d{2}-\d{2}$' or (c->>k)::date not between date '1900-01-01' and date '2100-12-31' or to_char((c->>k)::date,'YYYY-MM-DD')<>c->>k) then return false;end if;
  end if;
 end loop;
 if c->>'type'='event' and coalesce(c->>'eventStartDate','')='' then return false;end if;
 if coalesce(c->>'eventEndDate','')<>'' and (coalesce(c->>'eventStartDate','')='' or c->>'eventEndDate'<c->>'eventStartDate') then return false;end if;
 return true;
 exception when others then return false;
 end
$$;
create or replace function public.save_listing(listing_id uuid,content jsonb,submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
 declare target uuid; current_row public.listings;org uuid;
 begin
 -- Retired terms may be retained on their own listings, never newly selected.
 if listing_id is not null then
  select * into current_row from public.listings l where l.id=listing_id for update;
  if not found or not public.can_manage_listing(listing_id) then raise exception 'You cannot manage this listing' using errcode='42501';end if;
 end if;
 if not public.valid_listing(content) then raise exception 'Check the listing fields, categories and location.';end if;
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

notify pgrst, 'reload schema';
commit;

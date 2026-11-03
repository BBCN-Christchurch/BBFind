-- Events and venues do not require Find Me interest categories.
-- Existing category associations and permissions remain unchanged.
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
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>10 or (c->>'type' not in('event','venue') and jsonb_array_length(v)=0) then return false;end if;
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

notify pgrst, 'reload schema';
commit;

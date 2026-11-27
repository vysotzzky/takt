-- Staged JPEGs have a server-verifiable path derived from the session and event.
create policy employee_upload_proof on storage.objects
  for insert to authenticated with check (
    bucket_id = 'takt-evidence'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid())
                and p.role = 'employee' and p.is_active)
  );

create function private.record_shift_event(
  event_kind text, event_id uuid, expected_shift uuid,
  lat double precision, lng double precision, accuracy double precision
) returns uuid language plpgsql security definer set search_path = '' as $body$
declare
  caller uuid := auth.uid();
  target uuid;
  previous public.evidence%rowtype;
  photo text := caller::text || '/' || event_id::text || '.jpg';
  event_time timestamptz;
begin
  -- Serialize changes on the same account, including simultaneous tabs.
  perform 1 from public.profiles where id = caller and role = 'employee' and is_active for update;
  if not found then raise exception 'employee_required' using errcode = '42501'; end if;
  if event_kind is null or event_kind not in ('start', 'stop') or event_id is null
    or (event_kind = 'stop') <> (expected_shift is not null)
    or lat is null or lat not between -90 and 90 or lng is null or lng not between -180 and 180
    or accuracy is null or accuracy not between 0 and 41000000 then
    raise exception 'invalid_event' using errcode = '22023';
  end if;

  select e.* into previous from public.evidence e join public.shifts s on s.id = e.shift_id
    where e.request_id = event_id and s.employee_id = caller;
  if found then
    if previous.kind = event_kind and (expected_shift is null or expected_shift = previous.shift_id)
      and previous.latitude = lat and previous.longitude = lng and previous.accuracy_m = accuracy then
      return previous.shift_id;
    end if;
    raise exception 'event_conflict';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'takt-evidence'
                 and o.name = photo and o.owner_id = caller::text) then
    raise exception 'photo_required';
  end if;

  select id into target from public.shifts where employee_id = caller and ended_at is null;
  event_time := clock_timestamp();
  if event_kind = 'start' then
    if target is not null then raise exception 'shift_changed'; end if;
    insert into public.shifts(employee_id, started_at) values(caller, event_time) returning id into target;
  else
    if target is distinct from expected_shift then raise exception 'shift_changed'; end if;
    update public.shifts set ended_at = event_time where id = target;
  end if;
  insert into public.evidence(shift_id, kind, request_id, recorded_at, latitude, longitude, accuracy_m, photo_path)
    values(target, event_kind, event_id, event_time, lat, lng, accuracy, photo);
  return target;
end;
$body$;
revoke all on function private.record_shift_event(text,uuid,uuid,double precision,double precision,double precision) from public, anon, authenticated;
grant execute on function private.record_shift_event(text,uuid,uuid,double precision,double precision,double precision) to authenticated;

create function public.record_shift_event(
  event_kind text, event_id uuid, expected_shift uuid,
  lat double precision, lng double precision, accuracy double precision
) returns uuid language sql security invoker set search_path = '' as $$
  select private.record_shift_event(event_kind,event_id,expected_shift,lat,lng,accuracy);
$$;
revoke all on function public.record_shift_event(text,uuid,uuid,double precision,double precision,double precision) from public, anon, authenticated;
grant execute on function public.record_shift_event(text,uuid,uuid,double precision,double precision,double precision) to authenticated;

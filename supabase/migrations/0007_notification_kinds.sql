-- 0007: extend notification_kind enum with checked_in / checked_out so we can
-- log + push LINE Flex notifications for stay lifecycle events.

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'notification_kind'::regtype
      and enumlabel = 'checked_in'
  ) then
    alter type notification_kind add value 'checked_in';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'notification_kind'::regtype
      and enumlabel = 'checked_out'
  ) then
    alter type notification_kind add value 'checked_out';
  end if;
end $$;

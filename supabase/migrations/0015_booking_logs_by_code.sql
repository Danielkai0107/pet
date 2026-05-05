-- =====================================================================
-- 0015: get_booking_logs_by_code RPC
--
-- 提供 LIFF / 公開訂單頁面以「訂單代碼」為 bearer token 查詢入住日誌。
-- 與 get_booking_by_code (0008) / cancel_booking_by_code (0008) 同樣
-- 假設 booking.code 為 unguessable random string，可以視為授權憑證。
--
-- 只回傳 customer-facing 欄位：照片、文字、時間；不回傳店家內部欄位
-- (author_user_id / notify_status 等)。
-- =====================================================================

create or replace function get_booking_logs_by_code(p_code text)
returns table (
  id          uuid,
  photo_urls  text[],
  note        text,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    bl.id,
    bl.photo_urls,
    bl.note,
    bl.created_at
  from booking_logs bl
  join bookings b on b.id = bl.booking_id
  where b.code = p_code
  order by bl.created_at desc;
$$;

grant execute on function get_booking_logs_by_code(text) to anon, authenticated;

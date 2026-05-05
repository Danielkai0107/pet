import { useLocation } from "react-router-dom";

/**
 * Detect whether the current page is being rendered under the LIFF tree.
 * Returns the route prefix to use for sibling links so they stay in the
 * same layout (web → /shop, LIFF → /liff/shop).
 */
export function useRoutePrefix(): {
  isLiff: boolean;
  /** "/shop" or "/liff/shop" */
  shopPrefix: string;
  /** "/booking/success" or "/liff/booking/success" */
  bookingSuccessPrefix: string;
} {
  const { pathname } = useLocation();
  const isLiff = pathname.startsWith("/liff/");
  return {
    isLiff,
    shopPrefix: isLiff ? "/liff/shop" : "/shop",
    bookingSuccessPrefix: isLiff
      ? "/liff/booking/success"
      : "/booking/success",
  };
}

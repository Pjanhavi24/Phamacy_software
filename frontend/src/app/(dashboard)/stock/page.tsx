// The sidebar's "Stock Report" link points to /stock. Reuse the existing
// Stock Report page (also reachable from Reports → Stock Report) so both
// entry points render the same screen instead of 404-ing.
export { default } from "../reports/stock/page";

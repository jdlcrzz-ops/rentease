// Your plan. Change the numbers here to change what the landing page and
// billing page show. (New customers' price is set in the database too:
// see price_per_property in 006_subscriptions.sql, or change it per
// customer from the /admin page.)
export const PRICING = {
  trialDays: 30,
  pricePerProperty: 199, // PHP per property per month
  graceDays: 3,
  // How customers pay you for now. Fill in before launch.
  payTo: "GCash [YOUR GCASH NUMBER] ([ACCOUNT NAME]) or bank transfer to [BANK, ACCOUNT NUMBER]",
};

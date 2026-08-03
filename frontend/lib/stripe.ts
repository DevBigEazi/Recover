import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  appInfo: {
    name: "Recover Protocol",
    url: "https://userecover.xyz",
  },
});

export const STRIPE_PRICES = {
  REPORT_UNLOCK_PHONE_USD_CENTS: 350, // $3.50 USD for Phone category
  REPORT_UNLOCK_OTHER_USD_CENTS: 150, // $1.50 USD for Other categories
  PRO_STARTER_MONTHLY_CENTS: 1500, // $15.00 USD / mo
  PRO_STARTER_YEARLY_CENTS: 16200, // $162.00 USD / yr (10% discount)
  PRO_GROWTH_MONTHLY_CENTS: 4500, // $45.00 USD / mo
  PRO_GROWTH_YEARLY_CENTS: 48600, // $486.00 USD / yr (10% discount)
  PRO_SCALE_MONTHLY_CENTS: 10000, // $100.00 USD / mo
  PRO_SCALE_YEARLY_CENTS: 108000, // $1,080.00 USD / yr (10% discount)
};

/**
 * Finds or creates a Stripe Customer for a given user wallet address and email.
 */
export async function getOrCreateStripeCustomer(params: {
  walletAddress: string;
  email?: string | null;
  name?: string | null;
}): Promise<Stripe.Customer> {
  const { walletAddress, email, name } = params;
  const cleanAddress = walletAddress.toLowerCase();

  const existing = await stripe.customers.list({
    limit: 1,
    email: email || undefined,
  });

  if (existing.data.length > 0) {
    return existing.data[0];
  }

  return await stripe.customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: {
      walletAddress: cleanAddress,
    },
  });
}

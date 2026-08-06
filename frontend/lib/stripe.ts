import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  appInfo: {
    name: "Recover Protocol",
    url: "https://recoverprotocol.xyz",
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
 * Prioritizes existingStripeCustomerId, then exact metadata.walletAddress search,
 * falling back to customer creation. Does NOT perform unfiltered email lookup.
 */
export async function getOrCreateStripeCustomer(params: {
  walletAddress: string;
  email?: string | null;
  name?: string | null;
  existingStripeCustomerId?: string | null;
}): Promise<Stripe.Customer> {
  const { walletAddress, email, name, existingStripeCustomerId } = params;
  const cleanAddress = walletAddress.toLowerCase();

  if (existingStripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingStripeCustomerId);
      if (customer && !customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch {
      // If retrieval fails, proceed to fallback search
    }
  }

  try {
    const searchResult = await stripe.customers.search({
      query: `metadata['walletAddress']:'${cleanAddress}'`,
      limit: 1,
    });

    if (searchResult.data.length > 0) {
      return searchResult.data[0];
    }
  } catch {
    // If search is unavailable, proceed to customer creation
  }

  return await stripe.customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: {
      walletAddress: cleanAddress,
    },
  });
}

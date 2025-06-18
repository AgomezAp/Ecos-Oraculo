import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.SECRET_KEY!);
const calculateOrderAmount = (items: any[]) => {
  let total = 0;
  
  if (!items || !items.length) {
    console.log("Warning: Empty items array");
    return 1000; // Default amount in cents (e.g., $10.00)
  }
  
  items.forEach((item: any) => {
    if (item && typeof item.amount === 'number') {
      total += item.amount;
    } else {
      console.log("Warning: Item without valid amount", item);
    }
  });
  
  // Ensure minimum amount (Stripe requires at least 50 cents in most currencies)
  return Math.max(total, 100);
};

export const createPaymentIntentModel = async (items: any[]) => {
  return await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "eur",
    automatic_payment_methods: {
      enabled: true,
    },
  });
};
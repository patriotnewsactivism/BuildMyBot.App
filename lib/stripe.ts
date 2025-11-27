import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey) {
  console.warn('Stripe secret key is not set');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Product IDs will be set after creating Stripe products
export const STRIPE_PRODUCTS = {
  FREE: process.env.STRIPE_PRODUCT_FREE || '',
  STARTER: process.env.STRIPE_PRODUCT_STARTER || '',
  PROFESSIONAL: process.env.STRIPE_PRODUCT_PROFESSIONAL || '',
  EXECUTIVE: process.env.STRIPE_PRODUCT_EXECUTIVE || '',
  ENTERPRISE: process.env.STRIPE_PRODUCT_ENTERPRISE || '',
};

export const STRIPE_PRICES = {
  FREE: process.env.STRIPE_PRICE_FREE || '',
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  EXECUTIVE: process.env.STRIPE_PRICE_EXECUTIVE || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

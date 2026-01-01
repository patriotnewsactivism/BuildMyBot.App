/**
 * Script to seed Stripe Plans for BuildMyBot
 * 
 * Usage:
 * 1. Ensure you have the stripe package installed: npm install stripe
 * 2. Set your STRIPE_SECRET_KEY environment variable.
 * 3. Run: node scripts/createStripePlans.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PLANS = [
  { 
    id: 'starter',
    name: 'Starter', 
    amount: 2900, // in cents
    description: '1 Bot, 750 Conversations, GPT-4o Mini' 
  },
  { 
    id: 'professional',
    name: 'Professional', 
    amount: 9900, 
    description: '5 Bots, 5,000 Conversations, API Access' 
  },
  { 
    id: 'executive',
    name: 'Executive', 
    amount: 19900, 
    description: '10 Bots, 30,000 Conversations, Voice/Phone Agent' 
  },
  { 
    id: 'enterprise',
    name: 'Enterprise', 
    amount: 49900, 
    description: 'Unlimited Bots, 50,000 Conversations, White-label' 
  }
];

async function createPlans() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is missing.');
    process.exit(1);
  }

  console.log('Starting Stripe Plan Creation...');

  for (const plan of PLANS) {
    try {
      console.log(`Creating Product: ${plan.name}...`);
      
      const product = await stripe.products.create({
        name: `BuildMyBot - ${plan.name}`,
        description: plan.description,
        metadata: {
          app_plan_id: plan.id
        }
      });

      console.log(`Creating Price for ${plan.name}...`);
      
      const price = await stripe.prices.create({
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: product.id,
      });

      console.log(`✅ Created ${plan.name}: Product ID ${product.id}, Price ID ${price.id}`);
    } catch (error) {
      console.error(`❌ Failed to create ${plan.name}:`, error.message);
    }
  }

  console.log('\n--- Plan Creation Complete ---');
  console.log('Copy the Price IDs above into your Supabase database or backend configuration.');
}

createPlans();
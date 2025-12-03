import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/auth';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for raw webhook payload
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Handle subscription events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const { data: billingAccount } = await supabase
          .from('billing_accounts')
          .select('owner_id, id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!billingAccount) {
          console.error(`No billing account found for customer ${customerId}`);
          break;
        }

        // Update billing account
        await supabase
          .from('billing_accounts')
          .update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('id', billingAccount.id);

        // Map Stripe price ID to plan
        const planMapping: Record<string, string> = {
          'price_starter': 'STARTER',
          'price_professional': 'PROFESSIONAL',
          'price_executive': 'EXECUTIVE',
          'price_enterprise': 'ENTERPRISE',
        };

        const priceId = subscription.items.data[0]?.price.id;
        const plan = planMapping[priceId] || 'FREE';

        await supabase
          .from('profiles')
          .update({ plan })
          .eq('id', billingAccount.owner_id);

        console.log(`Updated subscription for user ${billingAccount.owner_id} to ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        const { data: billingAccount } = await supabase
          .from('billing_accounts')
          .select('owner_id, id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!billingAccount) break;

        // Downgrade to FREE plan
        await supabase
          .from('profiles')
          .update({ plan: 'FREE' })
          .eq('id', billingAccount.owner_id);

        await supabase
          .from('billing_accounts')
          .update({ status: 'canceled' })
          .eq('id', billingAccount.id);

        console.log(`Downgraded user ${billingAccount.owner_id} to FREE plan`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        const { data: billingAccount } = await supabase
          .from('billing_accounts')
          .select('owner_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!billingAccount) break;

        // Suspend account after payment failure
        await supabase
          .from('profiles')
          .update({ status: 'Suspended' })
          .eq('id', billingAccount.owner_id);

        // TODO: Send email notification to user
        console.log(`Suspended user ${billingAccount.owner_id} due to payment failure`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        const { data: billingAccount } = await supabase
          .from('billing_accounts')
          .select('owner_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!billingAccount) break;

        // Reactivate account after successful payment
        await supabase
          .from('profiles')
          .update({ status: 'Active' })
          .eq('id', billingAccount.owner_id);

        console.log(`Reactivated user ${billingAccount.owner_id} after successful payment`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

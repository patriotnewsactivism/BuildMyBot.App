// stripe-webhook Edge Function
// Handles Stripe webhook events for subscription management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Stripe } from "https://esm.sh/stripe@14.14.0?target=deno";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error("Stripe keys not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Received Stripe webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const planId = session.metadata?.plan_id;

        if (!userId || !planId) {
          console.error("Missing user_id or plan_id in session metadata");
          break;
        }

        console.log(`Upgrading user ${userId} to ${planId}`);

        // Update user's plan in database
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: planId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to update user plan:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update user plan" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // Log the upgrade event
        await supabase.from("usage_events").insert({
          user_id: userId,
          event_type: "plan_upgraded",
          quantity: 1,
          metadata: {
            plan_id: planId,
            session_id: session.id,
            amount_total: session.amount_total,
          },
        });

        console.log(`Successfully upgraded user ${userId} to ${planId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error("Missing user_id in subscription metadata");
          break;
        }

        // Check if subscription was canceled
        if (subscription.cancel_at_period_end) {
          console.log(`Subscription for user ${userId} will cancel at period end`);
          // You could set a flag in the database here
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error("Missing user_id in subscription metadata");
          break;
        }

        console.log(`Downgrading user ${userId} to FREE due to subscription deletion`);

        // Downgrade user to FREE plan
        const { error: downgradeError } = await supabase
          .from("profiles")
          .update({
            plan: "FREE",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (downgradeError) {
          console.error("Failed to downgrade user:", downgradeError);
        }

        // Log the downgrade event
        await supabase.from("usage_events").insert({
          user_id: userId,
          event_type: "plan_downgraded",
          quantity: 1,
          metadata: {
            plan_id: "FREE",
            reason: "subscription_deleted",
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription;

        if (subscription && typeof subscription === "string") {
          // Fetch subscription to get user_id from metadata
          const sub = await stripe.subscriptions.retrieve(subscription);
          const userId = sub.metadata?.user_id;

          if (userId) {
            console.log(`Payment failed for user ${userId}`);
            // Log payment failure
            await supabase.from("usage_events").insert({
              user_id: userId,
              event_type: "payment_failed",
              quantity: 1,
              metadata: {
                invoice_id: invoice.id,
                amount: invoice.amount_due,
              },
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in stripe-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

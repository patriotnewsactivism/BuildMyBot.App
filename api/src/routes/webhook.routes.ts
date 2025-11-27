/**
 * Webhook Routes
 * Handlers for third-party service webhooks (Stripe, etc.)
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    const db = admin.firestore();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Payment successful:', session.id);

        // Update user subscription in Firestore
        if (session.client_reference_id) {
          await db.collection('users').doc(session.client_reference_id).update({
            subscriptionStatus: 'active',
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        // Update subscription status
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('subscriptionId', '==', subscription.id).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: subscription.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', subscription.id);

        // Mark subscription as cancelled
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('subscriptionId', '==', subscription.id).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed:', invoice.id);

        // Handle payment failure (send email, update status, etc.)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed', message: error.message });
  }
});

/**
 * GET /api/webhooks/test
 * Test endpoint to verify webhooks are working
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

export default router;

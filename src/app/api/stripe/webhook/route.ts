import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getCheckoutLink, markCheckoutLinkPaid } from '@/lib/store';

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  const body = await req.text();

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const checkoutLinkToken = metadata.checkout_link_token;

      if (checkoutLinkToken) {
        const link = await getCheckoutLink(checkoutLinkToken);
        if (!link || link.status === 'paid') return NextResponse.json({ received: true });
        await markCheckoutLinkPaid(checkoutLinkToken, session.id, metadata.agreement_name || null, session.amount_total ?? link.priceCents);
        return NextResponse.json({ received: true });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};
      const checkoutLinkToken = metadata.checkout_link_token;

      if (checkoutLinkToken) {
        const link = await getCheckoutLink(checkoutLinkToken);
        if (!link || link.status === 'paid') return NextResponse.json({ received: true });
        await markCheckoutLinkPaid(
          checkoutLinkToken,
          paymentIntent.id,
          metadata.agreement_name || null,
          paymentIntent.amount_received || paymentIntent.amount
        );
        return NextResponse.json({ received: true });
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
}

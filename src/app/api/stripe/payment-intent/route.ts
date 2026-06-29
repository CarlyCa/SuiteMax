import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getCheckoutLink, updateCheckoutLink } from '@/lib/store';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const link = await getCheckoutLink(token);
  if (!link) return NextResponse.json({ error: 'Checkout link not found' }, { status: 404 });

  if (link.status === 'paid') {
    return NextResponse.json({ error: 'Checkout link is already paid' }, { status: 409 });
  }

  if (link.status === 'cancelled' || link.status === 'expired') {
    return NextResponse.json({ error: `Checkout link is ${link.status}` }, { status: 409 });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: link.priceCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    description: `${link.suiteNumber} - ${link.eventName}`,
    receipt_email: link.buyerEmail,
    metadata: {
      checkout_link_token: link.token,
      checkout_link_id: link.id,
      event_name: link.eventName,
      suite_number: link.suiteNumber,
      buyer_name: link.buyerName,
      buyer_email: link.buyerEmail
    }
  });

  await updateCheckoutLink(link.token, {
    status: 'pending_payment',
    stripeSessionId: paymentIntent.id
  });

  if (!paymentIntent.client_secret) {
    return NextResponse.json({ error: 'Stripe did not return a payment client secret' }, { status: 500 });
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  });
}

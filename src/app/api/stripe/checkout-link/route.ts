import { NextResponse } from 'next/server';
import { purchaseAgreementText } from '@/lib/checkout-links';
import { getStripe } from '@/lib/stripe';
import { getCheckoutLink, updateCheckoutLink } from '@/lib/store';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const formData = await req.formData();
  const agreementName = String(formData.get('agreementName') ?? '').trim();
  const agreementAccepted = formData.get('agreementAccepted') === 'on';
  const contactEmail = String(formData.get('contactEmail') ?? '').trim();
  const contactPhone = String(formData.get('contactPhone') ?? '').trim();
  const billingName = String(formData.get('billingName') ?? '').trim();
  const billingCompany = String(formData.get('billingCompany') ?? '').trim();
  const billingAddress1 = String(formData.get('billingAddress1') ?? '').trim();
  const billingAddress2 = String(formData.get('billingAddress2') ?? '').trim();
  const billingCity = String(formData.get('billingCity') ?? '').trim();
  const billingState = String(formData.get('billingState') ?? '').trim();

  const link = await getCheckoutLink(token);
  if (!link) return NextResponse.json({ error: 'Checkout link not found' }, { status: 404 });

  if (link.status === 'paid') {
    return NextResponse.redirect(`${url.protocol}//${url.host}/checkout/${link.token}`);
  }

  if (link.status === 'cancelled' || link.status === 'expired') {
    return NextResponse.json({ error: `Checkout link is ${link.status}` }, { status: 409 });
  }

  if (!agreementAccepted) {
    return NextResponse.json({ error: 'Agreement acceptance is required before payment' }, { status: 400 });
  }

  if (agreementName.toLowerCase() !== link.buyerName.toLowerCase()) {
    return NextResponse.json({ error: 'Agreement name must match buyer name' }, { status: 400 });
  }

  const stripe = getStripe();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: contactEmail || link.buyerEmail,
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    success_url: `${base}/success?checkout_link=${link.token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout/${link.token}`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: link.priceCents,
        product_data: {
          name: `${link.suiteNumber} - ${link.eventName}`,
          description: `${link.ticketCount} tickets, ${link.parkingPasses} parking passes`
        }
      }
    }],
    metadata: {
      checkout_link_token: link.token,
      checkout_link_id: link.id,
      agreement_name: agreementName,
      agreement_text: purchaseAgreementText(link),
      contact_email: contactEmail,
      contact_phone: contactPhone,
      billing_name: billingName,
      billing_company: billingCompany,
      billing_address_1: billingAddress1,
      billing_address_2: billingAddress2,
      billing_city: billingCity,
      billing_state: billingState
    }
  });

  await updateCheckoutLink(link.token, {
    status: 'pending_payment',
    agreementName,
    acceptedAt: new Date().toISOString(),
    stripeSessionId: session.id
  });

  return NextResponse.redirect(session.url as string, 303);
}

import { NextResponse } from 'next/server';
import { purchaseAgreementText } from '@/lib/checkout-links';
import { getStripe } from '@/lib/stripe';
import { getCheckoutLink, updateCheckoutLink } from '@/lib/store';

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to accept agreement before payment';
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(req: Request) {
  try {
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
    const paymentIntentId = String(formData.get('paymentIntentId') ?? '').trim();

    const link = await getCheckoutLink(token);
    if (!link) return NextResponse.json({ error: 'Checkout link not found' }, { status: 404 });

    if (link.status === 'paid') {
      return NextResponse.json({ error: 'Checkout link is already paid' }, { status: 409 });
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

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent is required' }, { status: 400 });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      receipt_email: contactEmail || link.buyerEmail,
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
      stripeSessionId: paymentIntentId
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}

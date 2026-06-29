import { formatCurrency, formatEventDate } from '@/lib/checkout-links';
import { sendPaymentConfirmationEmails } from '@/lib/email';
import { getStripe } from '@/lib/stripe';
import { getCheckoutLink, markCheckoutLinkPaid } from '@/lib/store';

export const dynamic = 'force-dynamic';

async function verifyPaymentAndSendEmail(checkoutToken: string, paymentIntentId: string) {
  const link = await getCheckoutLink(checkoutToken);
  if (!link) return null;

  if (link.status === 'paid') return link;

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = paymentIntent.metadata || {};
    const belongsToCheckout = metadata.checkout_link_token === checkoutToken;

    if (paymentIntent.status === 'succeeded' && belongsToCheckout) {
      const amountCents = paymentIntent.amount_received || paymentIntent.amount || link.priceCents;
      const paidLink = await markCheckoutLinkPaid(
        checkoutToken,
        paymentIntent.id,
        metadata.agreement_name || null,
        amountCents
      );

      if (paidLink) {
        await sendPaymentConfirmationEmails({
          link: paidLink,
          amountCents,
          paymentId: paymentIntent.id
        }).catch((error) => console.error(error));
        return paidLink;
      }
    }
  } catch (error) {
    console.error(error);
  }

  return link;
}

export default async function SuccessPage({ searchParams }: { searchParams: { checkout_link?: string; payment_intent?: string } }) {
  const link = searchParams.checkout_link && searchParams.payment_intent
    ? await verifyPaymentAndSendEmail(searchParams.checkout_link, searchParams.payment_intent)
    : searchParams.checkout_link
      ? await getCheckoutLink(searchParams.checkout_link)
      : null;

  return (
    <main className="page-shell narrow">
      <section className="panel paid-state">
        <h1>Thank You for Your Purchase</h1>
        <p>Your payment has been received. A confirmation email with your suite details will be sent shortly.</p>

        {link ? (
          <div className="summary-card success-summary">
            <h2>Purchase Summary</h2>
            <h3>{link.eventName}</h3>
            <p>{formatEventDate(new Date(link.eventDate))}</p>
            <div className="summary-line">
              <span>{link.suiteNumber}</span>
              <strong>{formatCurrency(link.priceCents)}</strong>
            </div>
            <p>{link.ticketCount} tickets, {link.parkingPasses} parking passes</p>
            <p>Catering: {link.cateringDetails}</p>
            <div className="summary-total">
              <span>Total Paid</span>
              <strong>{formatCurrency(link.priceCents)}</strong>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

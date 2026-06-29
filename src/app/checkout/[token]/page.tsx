import { notFound } from 'next/navigation';
import { formatCurrency, formatEventDate, purchaseAgreementText } from '@/lib/checkout-links';
import { getCheckoutLink } from '@/lib/store';
import { CheckoutAgreementForm } from './CheckoutAgreementForm';

export const dynamic = 'force-dynamic';

export default async function BuyerCheckoutPage({ params }: { params: { token: string } }) {
  const link = await getCheckoutLink(params.token);

  if (!link) notFound();

  const isPaid = link.status === 'paid';
  const isClosed = isPaid || link.status === 'cancelled' || link.status === 'expired';
  const agreementTitle = 'Charlotte Hornets Single Game Suite License Agreement';
  const serviceFeeCents = 0;
  const totalCents = link.priceCents + serviceFeeCents;

  return (
    <main className="embedded-checkout-shell">
      <div className="checkout-title-bar">Checkout</div>

      {isPaid ? (
        <section className="paid-state rams-state">
          <h2>Payment Complete</h2>
          <p>This checkout link has been paid. Confirmation details were recorded for the buyer and internal team.</p>
          <a className="button secondary" href="https://www.nba.com/hornets/">Return to Hornets.com</a>
        </section>
      ) : isClosed ? (
        <section className="paid-state rams-state">
          <h2>Checkout Unavailable</h2>
          <p>This checkout link is {link.status}. Contact your Hornets representative for an updated link.</p>
        </section>
      ) : (
        <div className="embedded-checkout-grid">
          <CheckoutAgreementForm
            agreementTitle={agreementTitle}
            amountLabel={formatCurrency(totalCents)}
            buyerEmail={link.buyerEmail}
            buyerName={link.buyerName}
            buyerPhone={link.buyerPhone}
            token={link.token}
          />

          <aside className="checkout-side">
            <section className="side-section">
              <h2>Order Summary</h2>
              <div className="summary-card">
                <h3>{link.eventName}</h3>
                <p>{formatEventDate(new Date(link.eventDate))}</p>
                <div className="summary-line">
                  <span>{link.suiteNumber}</span>
                  <strong>{formatCurrency(link.priceCents)}</strong>
                </div>
                <p>{link.ticketCount} tickets, {link.parkingPasses} parking passes</p>
                <p>Catering: {link.cateringDetails}</p>
                <div className="summary-total">
                  <span>Total Price</span>
                  <strong>{formatCurrency(totalCents)}</strong>
                </div>
                <small>Prices are in USD and include all fees</small>
              </div>
            </section>

            <section className="side-section">
              <h2>Location</h2>
              <p>Approximate location is indicated below.</p>
              <div className="location-card">
                <img
                  alt="Spectrum Center suite location map"
                  src="https://hornets.io-media.com/web/venueview/images/pricingMaps/OV_FullStadium_PM.jpg"
                />
              </div>
            </section>

            <section className="questions-card">
              <h2>Questions?</h2>
              <p>Email: {link.repEmail}</p>
              <p>Call: 704-HORNETS</p>
            </section>

            <section className="agreement-preview">
              <h2>Agreement Terms</h2>
              <p>{purchaseAgreementText(link)}</p>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}

import { formatCurrency, formatEventDate } from '@/lib/checkout-links';
import { getCheckoutLink } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function SuccessPage({ searchParams }: { searchParams: { checkout_link?: string } }) {
  const link = searchParams.checkout_link ? await getCheckoutLink(searchParams.checkout_link) : null;

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

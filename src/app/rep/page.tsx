import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dollarsToCents, formatCurrency, formatEventDate, newCheckoutToken } from '@/lib/checkout-links';
import { sendPaymentConfirmationEmails } from '@/lib/email';
import { hornetsSuiteLocationGroups } from '@/lib/hornets-suite-locations';
import { getStripe } from '@/lib/stripe';
import { CheckoutLinkRecord, createCheckoutLink as saveCheckoutLink, getCheckoutLink, listRecentCheckoutLinks, markCheckoutLinkPaid } from '@/lib/store';

export const dynamic = 'force-dynamic';

async function createCheckoutLink(formData: FormData) {
  'use server';

  const eventName = String(formData.get('eventName') ?? '').trim();
  const eventDate = String(formData.get('eventDate') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim();
  const suiteNumber = String(formData.get('suiteNumber') ?? '').trim();
  const buyerName = String(formData.get('buyerName') ?? '').trim();
  const buyerEmail = String(formData.get('buyerEmail') ?? '').trim();
  const repName = String(formData.get('repName') ?? '').trim();
  const repEmail = String(formData.get('repEmail') ?? '').trim();

  if (!eventName || !eventDate || !venue || !suiteNumber || !buyerName || !buyerEmail || !repName || !repEmail) {
    throw new Error('Missing required checkout details');
  }

  const link = await saveCheckoutLink({
    token: newCheckoutToken(),
    repName,
    repEmail,
    eventName,
    eventDate: new Date(eventDate).toISOString(),
    venue,
    suiteNumber,
    ticketCount: Number(formData.get('ticketCount') ?? 0),
    parkingPasses: Number(formData.get('parkingPasses') ?? 0),
    cateringDetails: String(formData.get('cateringDetails') ?? '').trim(),
    priceCents: dollarsToCents(formData.get('price')),
    buyerName,
    buyerEmail,
    buyerCompany: String(formData.get('buyerCompany') ?? '').trim() || null,
    buyerPhone: String(formData.get('buyerPhone') ?? '').trim() || null
  });

  redirect(`/rep?created=${link.token}`);
}

async function reconcilePaidLinks(links: CheckoutLinkRecord[]) {
  let stripe: ReturnType<typeof getStripe>;

  try {
    stripe = getStripe();
  } catch {
    return links;
  }

  return Promise.all(links.map(async (link) => {
    if (link.status !== 'pending_payment' || !link.stripeSessionId?.startsWith('pi_')) return link;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(link.stripeSessionId);
      if (paymentIntent.status !== 'succeeded') return link;

      const amountCents = paymentIntent.amount_received || paymentIntent.amount || link.priceCents;
      const paidLink = await markCheckoutLinkPaid(
        link.token,
        paymentIntent.id,
        paymentIntent.metadata?.agreement_name || null,
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
    } catch (error) {
      console.error(error);
    }

    return link;
  }));
}

export default async function RepPage({ searchParams }: { searchParams: { created?: string } }) {
  const created = searchParams.created
    ? await getCheckoutLink(searchParams.created)
    : null;

  const recentLinks = await reconcilePaidLinks(await listRecentCheckoutLinks(8));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  return (
    <main className="page-shell">
      <section className="page-header hornets-header">
        <div>
          <p className="eyebrow">Charlotte Hornets Premium Sales</p>
          <h1>Rep checkout link builder</h1>
          <p className="lede">Create a buyer-specific checkout page with the suite package, agreement acceptance, and Stripe payment link in one flow.</p>
        </div>
      </section>

      {created ? (
        <section className="notice">
          <div>
            <strong>Checkout link created</strong>
            <p>{created.buyerName} can review and pay for {created.eventName}.</p>
          </div>
          <Link className="button secondary" href={`/checkout/${created.token}`}>Open buyer page</Link>
          <code>{`${baseUrl}/checkout/${created.token}`}</code>
        </section>
      ) : null}

      <section className="split-layout">
        <form action={createCheckoutLink} className="panel form-grid">
          <div className="form-section">
            <h2>Deal Details</h2>
            <label>Event<input name="eventName" defaultValue="Hornets vs Celtics" required /></label>
            <label>Date and time<input name="eventDate" type="datetime-local" defaultValue="2026-11-14T19:00" required /></label>
            <label>Venue<input name="venue" defaultValue="Spectrum Center" required /></label>
            <label>
              Suite location
              <select name="suiteNumber" defaultValue="Annual Suite S16" required>
                {hornetsSuiteLocationGroups.map((group) => (
                  <optgroup label={group.label} key={group.label}>
                    {group.locations.map((location) => (
                      <option value={location} key={location}>{location}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="two-col">
              <label>Price<input name="price" inputMode="decimal" defaultValue="1" required /></label>
              <label>Tickets<input name="ticketCount" type="number" min="1" defaultValue="16" required /></label>
            </div>
            <label>Parking passes<input name="parkingPasses" type="number" min="0" defaultValue="4" required /></label>
            <label>Catering details<textarea name="cateringDetails" rows={4} defaultValue="Includes non-alcoholic beverages, chef's table, snacks, and dessert display. Alcohol available on consumption." required /></label>
          </div>

          <div className="form-section">
            <h2>Buyer</h2>
            <label>Buyer name<input name="buyerName" defaultValue="Carly Callans" required /></label>
            <label>Buyer email<input name="buyerEmail" type="email" defaultValue="carly@example.com" required /></label>
            <label>Company<input name="buyerCompany" defaultValue="Callans Partners" /></label>
            <label>Phone<input name="buyerPhone" defaultValue="704-555-0188" /></label>
          </div>

          <div className="form-section">
            <h2>Rep</h2>
            <label>Rep name<input name="repName" defaultValue="Charlotte Premium Sales" required /></label>
            <label>Rep email<input name="repEmail" type="email" defaultValue="premium@hornets.com" required /></label>
          </div>

          <button className="button" type="submit">Generate Checkout Link</button>
        </form>

        <aside className="panel">
          <h2>Recent Links</h2>
          <div className="link-list">
            {recentLinks.map((link) => (
              <Link href={`/checkout/${link.token}`} key={link.id} className="link-row">
                <span>
                  <strong>{link.eventName}</strong>
                  <small>{link.buyerName} · {formatEventDate(new Date(link.eventDate))}</small>
                </span>
                <span className={`status ${link.status}`}>{link.status.replace('_', ' ')}</span>
                <span>{formatCurrency(link.priceCents)}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

import Link from 'next/link';

export default function SuccessPage({ searchParams }: { searchParams: { checkout_link?: string } }) {
  return (
    <main className="page-shell narrow">
      <section className="panel paid-state">
        <h1>Payment Processing</h1>
        <p>Your checkout completed. Final confirmation will follow once Stripe webhook processing finishes.</p>
        {searchParams.checkout_link ? (
          <Link className="button secondary" href={`/checkout/${searchParams.checkout_link}`}>View Checkout Status</Link>
        ) : null}
      </section>
    </main>
  );
}

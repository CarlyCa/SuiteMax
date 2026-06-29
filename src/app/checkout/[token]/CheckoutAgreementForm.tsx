'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type CheckoutAgreementFormProps = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  token: string;
  agreementTitle: string;
  amountLabel: string;
};

export function CheckoutAgreementForm({ buyerEmail, buyerName, buyerPhone, token, agreementTitle, amountLabel }: CheckoutAgreementFormProps) {
  const [typedName, setTypedName] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const signed = useMemo(
    () => typedName.trim().toLowerCase() === buyerName.trim().toLowerCase(),
    [buyerName, typedName]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signed || isStartingPayment || clientSecret) return;

    if (!stripePromise) {
      setError('Stripe publishable key is missing. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Render.');
      return;
    }

    setError(null);
    setIsStartingPayment(true);

    try {
      const response = await fetch(`/api/stripe/checkout-link?token=${token}`, {
        method: 'POST',
        body: new FormData(event.currentTarget)
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'Unable to start Stripe checkout.');
        return;
      }

      setClientSecret(payload.clientSecret);
    } catch {
      setError('Unable to start Stripe checkout. Please try again.');
    } finally {
      setIsStartingPayment(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="embedded-checkout-form">
      <input type="hidden" name="agreementAccepted" value={signed ? 'on' : ''} />

      <section className="embedded-section">
        <h2>Contact</h2>
        <label>
          Email
          <input name="contactEmail" type="email" defaultValue={buyerEmail} required />
        </label>
        <label>
          Phone
          <input name="contactPhone" defaultValue={buyerPhone ?? ''} placeholder="(123) 456-7890" />
        </label>
      </section>

      <section className="embedded-section">
        <h2>Billing Address</h2>
        <div className="address-choice">
          <label><input name="addressType" type="radio" defaultChecked value="us" /> US Address</label>
          <label><input name="addressType" type="radio" value="non-us" /> Non-US Address</label>
        </div>
        <label>
          Billing Name
          <input name="billingName" defaultValue={buyerName} required />
        </label>
        <label>
          Company Name (if applicable)
          <input name="billingCompany" placeholder="XYZ Corporation" />
        </label>
        <label>
          Address
          <input name="billingAddress1" placeholder="200 Main St" required />
        </label>
        <label>
          Address 2 (optional)
          <input name="billingAddress2" placeholder="Apt 1" />
        </label>
        <label>
          City
          <input name="billingCity" placeholder="Anytown" required />
        </label>
        <label>
          State
          <select name="billingState" defaultValue="NC" required>
            <option value="AL">Alabama</option>
            <option value="CA">California</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="NC">North Carolina</option>
            <option value="NY">New York</option>
            <option value="SC">South Carolina</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="VA">Virginia</option>
          </select>
        </label>
      </section>

      <section className="embedded-section embedded-purchase-section">
        <h2>Purchase Agreement</h2>
        <p>Please view the {agreementTitle} by clicking the link below, then type your full name to indicate your acceptance of these terms.</p>
        <a
          className="agreement-link"
          href="#purchase-agreement"
        >
          View the {agreementTitle} <span aria-hidden="true">↗</span>
        </a>
        <label className="signature-label" id="purchase-agreement">
          I have read and agree to the terms:
          <input
            name="agreementName"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            placeholder="Type your name as your signature"
            autoComplete="name"
            required
          />
        </label>
      </section>

      <section className="embedded-section payment-section">
        <h2>Payment</h2>
        {!clientSecret ? (
          <div className="stripe-handoff">
            <div className="stripe-handoff-icon" aria-hidden="true">S</div>
            <div>
              <strong>Secure Stripe checkout</strong>
              <p>Type your name above to accept the agreement, then start the embedded payment form for {amountLabel} USD.</p>
            </div>
          </div>
        ) : null}
        {!clientSecret ? (
          <div className="embedded-submit-row">
            <button className="embedded-submit-payment-button" type="submit" disabled={!signed || isStartingPayment}>
              <span aria-hidden="true">▣</span> {isStartingPayment ? 'Starting Payment' : 'Start Payment'}
            </button>
            <div className="secure-badge">
              <span className="secure-lock">✓</span>
              <span><strong>Secure</strong><small>256-bit SSL encryption</small></span>
            </div>
          </div>
        ) : (
          <div className="embedded-stripe-panel">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
        {typedName && !signed ? <small className="form-warning">Name must match {buyerName}.</small> : null}
        {error ? <small className="form-warning">{error}</small> : null}
      </section>
    </form>
  );
}

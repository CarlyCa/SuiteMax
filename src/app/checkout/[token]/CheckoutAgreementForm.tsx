'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
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

type PaymentIntentState = {
  clientSecret: string;
  paymentIntentId: string;
};

export function CheckoutAgreementForm(props: CheckoutAgreementFormProps) {
  const [intent, setIntent] = useState<PaymentIntentState | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function createPaymentIntent() {
      if (!stripePromise) {
        setIntentError('Stripe publishable key is missing. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Render.');
        return;
      }

      try {
        const response = await fetch(`/api/stripe/payment-intent?token=${props.token}`, { method: 'POST' });
        const payload = await response.json();

        if (!active) return;

        if (!response.ok) {
          setIntentError(payload.error ?? 'Unable to load payment form.');
          return;
        }

        setIntent({
          clientSecret: payload.clientSecret,
          paymentIntentId: payload.paymentIntentId
        });
      } catch {
        if (active) setIntentError('Unable to load payment form. Please refresh and try again.');
      }
    }

    createPaymentIntent();

    return () => {
      active = false;
    };
  }, [props.token]);

  if (intentError) {
    return (
      <div className="embedded-checkout-form">
        <section className="embedded-section payment-section">
          <h2>Payment</h2>
          <small className="form-warning">{intentError}</small>
        </section>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="embedded-checkout-form">
        <section className="embedded-section payment-section">
          <h2>Payment</h2>
          <div className="stripe-handoff">
            <div className="stripe-handoff-icon" aria-hidden="true">S</div>
            <div>
              <strong>Loading secure payment form</strong>
              <p>Stripe is preparing the card entry fields for {props.amountLabel} USD.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#00788c',
            borderRadius: '4px',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }
        }
      }}
    >
      <CheckoutPaymentForm {...props} paymentIntentId={intent.paymentIntentId} />
    </Elements>
  );
}

function CheckoutPaymentForm({
  agreementTitle,
  amountLabel,
  buyerEmail,
  buyerName,
  buyerPhone,
  paymentIntentId,
  token
}: CheckoutAgreementFormProps & { paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [typedName, setTypedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signed = useMemo(
    () => typedName.trim().toLowerCase() === buyerName.trim().toLowerCase(),
    [buyerName, typedName]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signed || isSubmitting) return;

    if (!stripe || !elements) {
      setError('Stripe is still loading. Please try again in a moment.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setError(submitResult.error.message ?? 'Please check your payment details.');
        return;
      }

      const formData = new FormData(event.currentTarget);
      formData.set('paymentIntentId', paymentIntentId);

      const agreementResponse = await fetch(`/api/stripe/checkout-link?token=${token}`, {
        method: 'POST',
        body: formData
      });
      const agreementPayload = await agreementResponse.json();

      if (!agreementResponse.ok) {
        setError(agreementPayload.error ?? 'Unable to accept agreement before payment.');
        return;
      }

      const returnUrl = `${window.location.origin}/success?checkout_link=${token}&payment_intent=${paymentIntentId}`;
      const confirmResult = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required'
      });

      if (confirmResult.error) {
        setError(confirmResult.error.message ?? 'Payment could not be completed.');
        return;
      }

      window.location.href = returnUrl;
    } catch {
      setError('Unable to complete payment. Please try again.');
    } finally {
      setIsSubmitting(false);
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

      <section className="embedded-section payment-section">
        <h2>Payment</h2>
        <div className="embedded-stripe-panel payment-element-panel">
          <PaymentElement
            options={{
              business: { name: 'Hornets Premium Suites' },
              layout: {
                type: 'accordion',
                defaultCollapsed: false,
                radios: 'never',
                spacedAccordionItems: false
              },
              paymentMethodOrder: ['card'],
              wallets: {
                applePay: 'never',
                googlePay: 'never',
                link: 'never'
              },
              defaultValues: {
                billingDetails: {
                  name: buyerName,
                  email: buyerEmail,
                  phone: buyerPhone ?? undefined
                }
              }
            }}
          />
        </div>
      </section>

      <section className="embedded-section embedded-purchase-section">
        <h2>Purchase Agreement</h2>
        <p>Please view the {agreementTitle} by clicking the link below, then type your full name to indicate your acceptance of these terms.</p>
        <a
          className="agreement-link"
          href="https://www.ramssuites.com/purchase-agreement/?uid=5645203&persistUserId=tm686f5d8701685166"
          rel="noreferrer"
          target="_blank"
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

      <section className="embedded-submit-section">
        <p>Click below to submit {amountLabel} USD payment to Hornets Sports &amp; Entertainment.</p>
        <div className="embedded-submit-row">
          <button className="embedded-submit-payment-button" type="submit" disabled={!signed || isSubmitting || !stripe || !elements}>
            <span aria-hidden="true">▣</span> {isSubmitting ? 'Submitting Payment' : 'Submit Payment'}
          </button>
          <div className="secure-badge">
            <span className="secure-lock">✓</span>
            <span><strong>Secure</strong><small>256-bit SSL encryption</small></span>
          </div>
        </div>
        {typedName && !signed ? <small className="form-warning">Name must match {buyerName}.</small> : null}
        {error ? <small className="form-warning">{error}</small> : null}
      </section>
    </form>
  );
}

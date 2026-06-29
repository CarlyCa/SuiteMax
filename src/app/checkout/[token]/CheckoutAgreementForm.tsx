'use client';

import { useMemo, useState } from 'react';

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
  const signed = useMemo(
    () => typedName.trim().toLowerCase() === buyerName.trim().toLowerCase(),
    [buyerName, typedName]
  );

  return (
    <form action={`/api/stripe/checkout-link?token=${token}`} method="POST" className="embedded-checkout-form">
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
        <div className="embedded-payment-methods">
          <button className="embedded-payment-method active" type="button">
            <span className="card-icon">▰</span>
            <strong>Card</strong>
          </button>
          <button className="embedded-payment-method" type="button">
            <span className="gpay-pill">G Pay</span>
            <strong>Google Pay</strong>
          </button>
        </div>

        <div className="embedded-link-row-secure">
          <span className="lock-icon">▣</span>
          <span>Secure, fast checkout with Link</span>
          <span className="chevron">⌄</span>
        </div>

        <div className="embedded-payment-fields">
          <label className="field-full">
            Card number
            <div className="card-number-shell">
              <input placeholder="1234 1234 1234 1234" />
              <span className="card-brands">VISA MC AMEX DISC</span>
            </div>
          </label>
          <label>
            Expiration date
            <input placeholder="MM / YY" />
          </label>
          <label>
            Security code
            <input placeholder="CVC" />
          </label>
          <label>
            Country
            <select defaultValue="United States">
              <option>United States</option>
            </select>
          </label>
          <label>
            ZIP code
            <input placeholder="12345" />
          </label>
        </div>
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

      <section className="embedded-submit-section">
        <p>Click below to submit {amountLabel} USD payment to Hornets Sports &amp; Entertainment.</p>
        <div className="embedded-submit-row">
          <button className="embedded-submit-payment-button" type="submit" disabled={!signed}>
            <span aria-hidden="true">▣</span> Submit Payment
          </button>
          <div className="secure-badge">
            <span className="secure-lock">✓</span>
            <span><strong>Secure</strong><small>256-bit SSL encryption</small></span>
          </div>
        </div>
        {typedName && !signed ? <small className="form-warning">Name must match {buyerName}.</small> : null}
      </section>
    </form>
  );
}

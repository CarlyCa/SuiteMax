import { formatCurrency, formatEventDate } from '@/lib/checkout-links';
import { CheckoutLinkRecord } from '@/lib/store';

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type PaymentEmailInput = {
  link: CheckoutLinkRecord;
  amountCents: number;
  paymentId: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmail({ html, subject, text, to }: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.info(`Email not sent; RESEND_API_KEY or RESEND_FROM_EMAIL is missing. Recipient: ${to}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }
}

export async function sendPaymentConfirmationEmails({ amountCents, link, paymentId }: PaymentEmailInput) {
  const amount = formatCurrency(amountCents);
  const eventDate = formatEventDate(new Date(link.eventDate));
  const safeEvent = escapeHtml(link.eventName);
  const safeSuite = escapeHtml(link.suiteNumber);
  const safeBuyer = escapeHtml(link.buyerName);
  const safeVenue = escapeHtml(link.venue);
  const safeCatering = escapeHtml(link.cateringDetails);
  const safePaymentId = escapeHtml(paymentId);
  const internalRecipient = process.env.INTERNAL_CONFIRMATION_EMAIL || link.repEmail;

  const buyerText = [
    `Hi ${link.buyerName},`,
    '',
    `Your Hornets Premium Suites payment for ${link.eventName} is confirmed.`,
    `Suite: ${link.suiteNumber}`,
    `Venue: ${link.venue}`,
    `Event date: ${eventDate}`,
    `Tickets: ${link.ticketCount}`,
    `Parking passes: ${link.parkingPasses}`,
    `Catering: ${link.cateringDetails}`,
    `Total paid: ${amount}`,
    '',
    'Thank you,',
    'Hornets Premium Suites'
  ].join('\n');

  const buyerHtml = `
    <div style="font-family:Arial,sans-serif;color:#20232b;line-height:1.5">
      <h1 style="color:#1d1160">Payment Confirmed</h1>
      <p>Hi ${safeBuyer},</p>
      <p>Your Hornets Premium Suites payment is confirmed.</p>
      <table style="border-collapse:collapse;margin:18px 0">
        <tr><td style="padding:6px 12px 6px 0"><strong>Event</strong></td><td>${safeEvent}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Date</strong></td><td>${escapeHtml(eventDate)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Venue</strong></td><td>${safeVenue}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Suite</strong></td><td>${safeSuite}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Tickets</strong></td><td>${link.ticketCount}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Parking</strong></td><td>${link.parkingPasses} passes</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Catering</strong></td><td>${safeCatering}</td></tr>
        <tr><td style="padding:6px 12px 6px 0"><strong>Total paid</strong></td><td>${escapeHtml(amount)}</td></tr>
      </table>
      <p>Thank you,<br />Hornets Premium Suites</p>
    </div>
  `;

  const internalText = [
    `${link.buyerName} completed payment for ${link.eventName}.`,
    '',
    `Buyer: ${link.buyerName} <${link.buyerEmail}>`,
    `Suite: ${link.suiteNumber}`,
    `Total paid: ${amount}`,
    `Payment ID: ${paymentId}`
  ].join('\n');

  const internalHtml = `
    <div style="font-family:Arial,sans-serif;color:#20232b;line-height:1.5">
      <h1>Suite checkout paid</h1>
      <p><strong>${safeBuyer}</strong> completed payment for ${safeEvent}.</p>
      <ul>
        <li>Buyer: ${safeBuyer} &lt;${escapeHtml(link.buyerEmail)}&gt;</li>
        <li>Suite: ${safeSuite}</li>
        <li>Total paid: ${escapeHtml(amount)}</li>
        <li>Payment ID: ${safePaymentId}</li>
      </ul>
    </div>
  `;

  await Promise.all([
    sendEmail({
      to: link.buyerEmail,
      subject: `Payment confirmed: ${link.eventName}`,
      html: buyerHtml,
      text: buyerText
    }),
    sendEmail({
      to: internalRecipient,
      subject: `Suite checkout paid: ${link.buyerName}`,
      html: internalHtml,
      text: internalText
    })
  ]);
}

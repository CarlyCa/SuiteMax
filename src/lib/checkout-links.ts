import crypto from 'crypto';
import { CheckoutLinkRecord } from '@/lib/store';

export function dollarsToCents(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? '').replace(/[$,]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Price must be greater than zero');
  }
  return Math.round(amount * 100);
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

export function newCheckoutToken() {
  return crypto.randomBytes(9).toString('base64url');
}

export function purchaseAgreementText(link: CheckoutLinkRecord) {
  return [
    `I authorize the Charlotte Hornets to charge ${formatCurrency(link.priceCents)} for ${link.suiteNumber} at ${link.eventName}.`,
    `This purchase includes ${link.ticketCount} tickets, ${link.parkingPasses} parking passes, and the catering package described on this checkout page.`,
    'I understand all premium suite sales are subject to team approval, venue policies, and the terms shared by my Hornets representative.'
  ].join(' ');
}

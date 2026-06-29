import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type CheckoutLinkStatus = 'sent' | 'pending_payment' | 'paid' | 'expired' | 'cancelled';

export type CheckoutLinkRecord = {
  id: string;
  token: string;
  status: CheckoutLinkStatus;
  repName: string;
  repEmail: string;
  eventName: string;
  eventDate: string;
  venue: string;
  suiteNumber: string;
  ticketCount: number;
  parkingPasses: number;
  cateringDetails: string;
  priceCents: number;
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string | null;
  buyerPhone: string | null;
  agreementName: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  stripeSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationLogRecord = {
  id: string;
  checkoutLinkId: string;
  recipient: string;
  channel: string;
  subject: string;
  body: string;
  createdAt: string;
};

type StoreData = {
  checkoutLinks: CheckoutLinkRecord[];
  notificationLogs: NotificationLogRecord[];
};

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const storePath = path.join(dataDir, 'store.json');

function id(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

function defaultStore(): StoreData {
  const timestamp = now();

  return {
    checkoutLinks: [
      {
        id: id('chk'),
        token: 'hornets-demo',
        status: 'sent',
        repName: 'Charlotte Premium Sales',
        repEmail: 'premium@hornets.com',
        eventName: 'Hornets vs Celtics',
        eventDate: '2026-11-14T19:00:00-05:00',
        venue: 'Spectrum Center',
        suiteNumber: 'Suite 218',
        ticketCount: 16,
        parkingPasses: 4,
        cateringDetails: "Includes non-alcoholic beverages, chef's table, snacks, and dessert display. Alcohol available on consumption.",
        priceCents: 850000,
        buyerName: 'Jordan Avery',
        buyerEmail: 'jordan@example.com',
        buyerCompany: 'Avery Partners',
        buyerPhone: '704-555-0188',
        agreementName: null,
        acceptedAt: null,
        paidAt: null,
        stripeSessionId: null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ],
    notificationLogs: []
  };
}

async function writeStore(data: StoreData) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function readStore(): Promise<StoreData> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    const parsed = JSON.parse(await fs.readFile(storePath, 'utf8')) as Partial<StoreData>;
    return {
      checkoutLinks: parsed.checkoutLinks ?? [],
      notificationLogs: parsed.notificationLogs ?? []
    };
  } catch {
    const seeded = defaultStore();
    await writeStore(seeded);
    return seeded;
  }
}

export async function createCheckoutLink(input: Omit<CheckoutLinkRecord, 'id' | 'status' | 'agreementName' | 'acceptedAt' | 'paidAt' | 'stripeSessionId' | 'createdAt' | 'updatedAt'>) {
  const data = await readStore();
  const timestamp = now();
  const link: CheckoutLinkRecord = {
    ...input,
    id: id('chk'),
    status: 'sent',
    agreementName: null,
    acceptedAt: null,
    paidAt: null,
    stripeSessionId: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  data.checkoutLinks.push(link);
  await writeStore(data);
  return link;
}

export async function getCheckoutLink(token: string) {
  const data = await readStore();
  const link = data.checkoutLinks.find((item) => item.token === token);
  if (!link) return null;

  return {
    ...link,
    notifications: data.notificationLogs.filter((item) => item.checkoutLinkId === link.id)
  };
}

export async function listRecentCheckoutLinks(limit = 8) {
  const data = await readStore();
  return [...data.checkoutLinks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function updateCheckoutLink(token: string, updates: Partial<CheckoutLinkRecord>) {
  const data = await readStore();
  const link = data.checkoutLinks.find((item) => item.token === token);
  if (!link) return null;

  Object.assign(link, updates, { updatedAt: now() });
  await writeStore(data);
  return link;
}

export async function markCheckoutLinkPaid(token: string, stripeSessionId: string, agreementName: string | null, amountCents: number) {
  const data = await readStore();
  const link = data.checkoutLinks.find((item) => item.token === token);
  if (!link || link.status === 'paid') return link ?? null;

  link.status = 'paid';
  link.paidAt = now();
  link.stripeSessionId = stripeSessionId;
  link.agreementName = agreementName || link.agreementName;
  link.acceptedAt = link.acceptedAt ?? now();
  link.updatedAt = now();

  data.notificationLogs.push(
    {
      id: id('note'),
      checkoutLinkId: link.id,
      recipient: link.buyerEmail,
      channel: 'email',
      subject: `Payment confirmed: ${link.eventName}`,
      body: `Confirmation for ${link.suiteNumber}. Total paid: $${(amountCents / 100).toLocaleString()}.`,
      createdAt: now()
    },
    {
      id: id('note'),
      checkoutLinkId: link.id,
      recipient: link.repEmail,
      channel: 'email',
      subject: `Suite checkout paid: ${link.buyerName}`,
      body: `${link.buyerName} paid for ${link.eventName}, ${link.suiteNumber}. Stripe session: ${stripeSessionId}.`,
      createdAt: now()
    }
  );

  await writeStore(data);
  return link;
}

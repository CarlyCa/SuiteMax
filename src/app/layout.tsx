import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hornets Suite Checkout',
  description: 'Rep-generated suite checkout links'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="utility-nav">
            <span>NBA</span>
            <span>Hornets Sports &amp; Entertainment</span>
          </div>
          <nav className="team-nav" aria-label="Charlotte Hornets checkout navigation">
            <Link className="team-brand" href="/rep">
              <span className="brand-mark">CHA</span>
              <span className="brand-copy">
                <strong>HORNETS</strong>
                <small>PREMIUM SUITES</small>
              </span>
            </Link>
            <div className="team-links">
              <Link href="/rep">Premium Checkout</Link>
              <a href="https://www.nba.com/hornets/tickets">Tickets</a>
              <a href="https://www.nba.com/hornets/schedule">Schedule</a>
              <a href="https://www.nba.com/hornets/">Hornets.com</a>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

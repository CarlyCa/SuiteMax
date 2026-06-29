import type { Metadata } from 'next';
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
            <a className="team-brand" href="https://www.nba.com/hornets/">
              <img
                className="brand-logo"
                src="https://cdn.nba.com/logos/nba/1610612766/primary/D/logo.svg"
                alt="Charlotte Hornets"
              />
              <span className="brand-divider" aria-hidden="true" />
              <span className="brand-label">Premium Suites</span>
            </a>
            <div className="team-links">
              <a href="https://www.hornetspremium.com/">Explore Suites</a>
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

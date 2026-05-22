import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: '8rem',
        background: 'var(--bg-deep)',
        borderTop: '1px solid var(--line)',
        padding: 'clamp(3rem, 7vw, 6rem) clamp(1rem, 3vw, 2.5rem) 2rem',
      }}
    >
      <div
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2.5rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpeg"
                alt="Homeera logo"
                width={40}
                height={40}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </span>
            Homeera
          </div>
          <p style={{ color: 'var(--ink-soft)', maxWidth: 320 }}>
            Calm, considered objects for a slower home.
          </p>
        </div>
        <FooterCol
          title="Shop"
          links={[
            ['Living', '/shop?cat=living'],
            ['Decor', '/shop?cat=decor'],
            ['Lighting', '/shop?cat=lighting'],
            ['Outdoor', '/shop?cat=outdoor'],
          ]}
        />
        <FooterCol
          title="Studio"
          links={[
            ['About', '/about'],
            ['Journal', '/journal'],
            ['Contact', '/contact'],
          ]}
        />
        <FooterCol
          title="Care"
          links={[
            ['Shipping', '/shipping'],
            ['Returns', '/returns'],
            ['Privacy', '/privacy'],
          ]}
        />
      </div>
      <div
        className="container"
        style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.82rem',
          color: 'var(--ink-soft)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>© {new Date().getFullYear()} Homeera</span>
        <span>Designed slowly. Shipped quietly.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} data-hover>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

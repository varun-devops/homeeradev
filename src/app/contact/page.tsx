import type { Metadata } from 'next';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Contact — Write to the studio',
  description:
    'Get in touch with Homeera about products, trade enquiries, repairs and press.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <article className="container" style={{ padding: '8rem 0 4rem', maxWidth: 880 }}>
      <Reveal>
        <p
          style={{
            fontSize: '0.78rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: '1rem',
          }}
        >
          Contact
        </p>
      </Reveal>
      <Reveal delay={80}>
        <h1 style={{ fontStyle: 'italic' }}>Write to the studio.</h1>
      </Reveal>
      <Reveal delay={160}>
        <p style={{ marginTop: '1.5rem', color: 'var(--ink-soft)', fontSize: '1.05rem' }}>
          We read everything. Replies usually come within two working days
          from someone in the studio — not a queue.
        </p>
      </Reveal>

      <form
        action="mailto:hello@homeera.com"
        method="post"
        encType="text/plain"
        style={{
          marginTop: '3rem',
          display: 'grid',
          gap: '1.25rem',
          maxWidth: 560,
        }}
      >
        <Field name="name" label="Your name" />
        <Field name="email" label="Email" type="email" />
        <Field name="topic" label="Topic" placeholder="Product, trade, repair, press…" />
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={inputLabel}>Message</span>
          <textarea
            name="message"
            rows={6}
            required
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </label>
        <button
          type="submit"
          data-hover
          style={{
            justifySelf: 'start',
            padding: '0.95rem 1.8rem',
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 999,
            fontSize: '0.82rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Send note
        </button>
      </form>

      <div style={{ marginTop: '4rem', display: 'grid', gap: '0.4rem', color: 'var(--ink-soft)' }}>
        <div>Studio · Mon–Fri · 10–17</div>
        <div>hello@homeera.com</div>
        <div>14 Atelier Lane, Wellington</div>
      </div>
    </article>
  );
}

const inputLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
};

const inputStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'transparent',
  font: 'inherit',
  color: 'var(--ink)',
};

function Field({
  name,
  label,
  type = 'text',
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: '0.4rem' }}>
      <span style={inputLabel}>{label}</span>
      <input name={name} type={type} placeholder={placeholder} required style={inputStyle} />
    </label>
  );
}

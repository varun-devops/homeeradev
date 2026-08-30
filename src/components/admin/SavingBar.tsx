'use client';

/**
 * Thin progress bar pinned to the top of the viewport while an admin action
 * is in flight.
 *
 * A disabled button reading "Saving…" is easy to miss when the button is
 * below the fold on a long form, which is exactly where the Save button sits
 * on the product page. This is always in view.
 *
 * Indeterminate on purpose: a server action gives no progress to report, and
 * a bar that pretends to know how far along it is reads as broken when it
 * sits at 80% waiting. This one just keeps moving while work is happening.
 */
export default function SavingBar({ active }: { active: boolean }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes adminSavingSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .adminSaving {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          z-index: 200;
          overflow: hidden;
          background: rgba(212, 181, 116, 0.15);
          pointer-events: none;
        }
        .adminSaving::after {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 25%;
          background: var(--gold);
          animation: adminSavingSlide 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          /* No travelling bar; hold a static fill so the state is still shown. */
          .adminSaving::after { animation: none; width: 100%; opacity: 0.5; }
        }
      `,
        }}
      />
      {active && <div className="adminSaving" role="status" aria-label="Saving" />}
    </>
  );
}

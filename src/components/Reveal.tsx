'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  /** Stagger delay in ms (kept for API compatibility with old usages). */
  delay?: number;
  /** Initial downward offset in px. */
  y?: number;
  /** Which element to render. */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Framer Motion scroll-reveal.
 *
 * Fades + rises into place the first time it scrolls into view (`whileInView`
 * with `once`). Replaces the old IntersectionObserver/CSS implementation so all
 * scroll animations run through Framer Motion — the site's single animation lib.
 * Respects prefers-reduced-motion (renders with no movement).
 */
export default function Reveal({ children, delay = 0, y = 24, as = 'div', className, style }: Props) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 },
    },
  };

  const MotionTag = motion[as as 'div'];

  return (
    <MotionTag
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -10% 0px' }}
    >
      {children}
    </MotionTag>
  );
}

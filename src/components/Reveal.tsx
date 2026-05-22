'use client';

import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  as?: keyof JSX.IntrinsicElements;
};

export default function Reveal({ children, delay = 0, y = 24, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = `translateY(${y}px)`;
    el.style.transition = `opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 1000ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = '1';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, y]);

  return (
    // @ts-expect-error - dynamic tag ref typing
    <Tag ref={ref}>{children}</Tag>
  );
}

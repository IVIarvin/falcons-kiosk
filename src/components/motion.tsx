'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLinkStatus } from 'next/link';

export function trackInputModality() {
  const root = document.documentElement;
  const pointer = () => {
    root.dataset.input = 'pointer';
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) root.dataset.input = 'keyboard';
  };
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('keydown', keyboard, true);
  return () => {
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('keydown', keyboard, true);
  };
}

export function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span className="nav-pending" data-pending={pending || undefined} aria-hidden="true" />;
}

export function RouteMotion({ route, children }: { route: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || document.documentElement.dataset.input === 'keyboard') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tokens = getComputedStyle(document.documentElement);
    const easing = tokens.getPropertyValue('--ease').trim();
    const time = tokens
      .getPropertyValue(reduced.matches ? '--motion-press' : '--motion-feedback')
      .trim();
    const duration = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
    // Keep the content visible throughout; never fade the page to the background.
    // Only the title moves, so sticky/fixed descendants retain their containing block.
    const animations = [element.animate([{ opacity: 0.9 }, { opacity: 1 }], { duration, easing })];
    const title = element.querySelector('.page-title');
    if (title && !reduced.matches) {
      animations.push(
        title.animate([{ transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], {
          duration,
          easing,
        }),
      );
    }
    const stop = () => animations.forEach((animation) => animation.cancel());
    reduced.addEventListener('change', stop);
    return () => {
      reduced.removeEventListener('change', stop);
      stop();
    };
  }, [route]);
  return (
    <div className="route-view" ref={ref}>
      {children}
    </div>
  );
}

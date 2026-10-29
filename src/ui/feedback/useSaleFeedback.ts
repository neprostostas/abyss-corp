import { useEffect, useRef } from 'react';

export function useSaleFeedback(layerId: string) {
  const walletRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLButtonElement>(null);
  const animations = useRef(new Set<Animation>());
  const particles = useRef(new Set<HTMLElement>());
  useEffect(
    () => () => {
      for (const animation of animations.current) animation.cancel();
      for (const particle of particles.current) particle.remove();
      animations.current.clear();
      particles.current.clear();
    },
    [layerId],
  );
  const play = () => {
    const wallet = walletRef.current;
    const button = sellRef.current;
    if (
      !wallet ||
      !button ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    // Keep a rapid sequence bounded and remove effects from the previous sale.
    for (const animation of animations.current) animation.cancel();
    for (const particle of particles.current) particle.remove();
    animations.current.clear();
    particles.current.clear();
    const track = (animation: Animation) => {
      animations.current.add(animation);
      const done = () => animations.current.delete(animation);
      animation.onfinish = done;
      animation.oncancel = done;
    };
    const from = button.getBoundingClientRect();
    const to = wallet.getBoundingClientRect();
    const x = from.left + from.width * 0.65;
    const y = from.top + from.height * 0.5;
    const dx = to.left + 24 - x;
    const dy = to.top + to.height * 0.5 - y;
    for (let i = 0; i < 5; i++) {
      const coin = document.createElement('span');
      coin.className = 'sale-coin';
      coin.setAttribute('aria-hidden', 'true');
      coin.style.left = `${String(x)}px`;
      coin.style.top = `${String(y)}px`;
      document.body.append(coin);
      particles.current.add(coin);
      const animation = coin.animate(
        [
          { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
          {
            transform: `translate(${String((i - 2) * 14)}px, -35px) scale(1)`,
            opacity: 1,
            offset: 0.2,
          },
          {
            transform: `translate(${String(dx)}px, ${String(dy)}px) scale(.55)`,
            opacity: 1,
            offset: 0.9,
          },
          {
            transform: `translate(${String(dx)}px, ${String(dy)}px) scale(.25)`,
            opacity: 0,
          },
        ],
        {
          duration: 620,
          delay: i * 45,
          easing: 'cubic-bezier(.3,.05,.5,1)',
          fill: 'both',
        },
      );
      track(animation);
      const remove = () => {
        coin.remove();
        particles.current.delete(coin);
        animations.current.delete(animation);
      };
      animation.onfinish = remove;
      animation.oncancel = remove;
    }
    track(
      wallet.animate(
        [
          { transform: 'scale(1)' },
          {
            transform: 'scale(1.055)',
            filter: 'drop-shadow(0 0 8px #f5d78b99)',
            offset: 0.45,
          },
          { transform: 'scale(1)', filter: 'drop-shadow(0 0 0px transparent)' },
        ],
        { duration: 300, delay: 540 },
      ),
    );
    track(
      button.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], {
        duration: 180,
      }),
    );
  };
  return { walletRef, sellRef, play };
}

import {cn} from '@/lib/utils';
import {useMemo, useRef, useState} from 'react';

/**
 * SpoilerText
 *
 * Renders a string of text hidden behind an animated layer of floating dots.
 * Clicking the layer reveals the text.
 *
 * @param {string} text - The text to display once revealed.
 */
export default function SpoilerText({
  children,
  textLength,
}: {
  children: React.ReactNode;
  textLength: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const componentRef = useRef(null);
  const dotsCount = textLength * 95;
  const dots = useMemo(() => <Dots count={dotsCount} />, [dotsCount]);

  // Otherwise, show the floating-dots overlay
  return (
    <span
      className="relative inline-block cursor-pointer"
      onClick={() => setRevealed(!revealed)}
    >
      <div ref={componentRef} className={cn(!revealed && 'invisible')}>
        {children}
      </div>
      <div className={cn(revealed && 'invisible')}>{dots}</div>
    </span>
  );
}

function Dots({count}: {count: number}) {
  console.log('dots dots dots', count);

  const dots = [];
  for (let i = 0; i < count; i++) {
    // Random position in the container (0–100%)
    const top = Math.random() * 100;
    const left = Math.random() * 100;

    // Random angle (0–360) and distance (~4–8px)
    const angle = 2 * Math.PI * Math.random();
    const distance = 4 + Math.random() * 4; // 4–8px
    const tx = distance * Math.cos(angle);
    const ty = distance * Math.sin(angle);

    // Random delay up to 2s, random total duration ~1.5–2.5s
    const delay = 0;
    const duration = 1.5 + Math.random() * 2;

    dots.push({top, left, tx, ty, delay, duration});
  }
  // Otherwise, show the floating-dots overlay
  return (
    <>
      {dots.map((dot, i) => (
        <span
          key={i}
          className="absolute block h-[1px] w-[1px] animate-float-dot rounded-full bg-gray-500"
          style={
            {
              // Position each dot randomly within the container
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              // Use the custom CSS variables that the keyframe will pick up
              '--tx': `${dot.tx}px`,
              '--ty': `${dot.ty}px`,
              // Stagger them with random delays/durations
              animationDuration: `${dot.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

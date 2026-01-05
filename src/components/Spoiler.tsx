import {useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '@/lib/utils';

const DOTS_PER_PX = 0.2;

export function Spoiler({children}: {children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!ref || !ref.current) {
      return;
    }
    setArea(ref.current.clientHeight * ref.current.clientWidth);
  }, []);
  return (
    <span
      className="relative inline-block cursor-pointer"
      onClick={e => {
        e.preventDefault();
        setRevealed(!revealed);
      }}
    >
      <div ref={ref} className={cn(!revealed && 'invisible')}>
        {children}
      </div>
      {!revealed && <CanvasDots count={area * DOTS_PER_PX} />}
    </span>
  );
}

// Dot travels randomly wihin canvas, the params fully describes this animation.
interface DotParams {
  // Starting point of the dot, percentage relative to the container.
  topPercent: number;
  leftPercent: number;
  // Dot travel angle.
  angle: number;
  // Travel distance in pixels.
  distancePx: number;
  // Animation duration.
  durationSeconds: number;
  // Delay before starting the animation.
  startOffsetSeconds: number;
}

/**
 * CanvasDots renders an animated swarm of dots using a single <canvas>.
 */
function CanvasDots({count}: {count: number}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Generate dot properties which unambiguously describe the dot's position and animation.
  const dots = useMemo(() => {
    const result: DotParams[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        topPercent: Math.random() * 100,
        leftPercent: Math.random() * 100,
        angle: 2 * Math.PI * Math.random(),
        distancePx: 4 + Math.random() * 4,
        durationSeconds: 1.5 + Math.random() * 2,
        startOffsetSeconds: Math.random() * 2,
      });
    }
    return result;
  }, [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', {alpha: true});
    if (!canvas || !ctx) {
      return;
    }

    let animationFrameId = 0;
    let startTimeMillis: number | null = null;

    /**
     * Adjusts the canvas size to match its parent element, factoring in
     * device pixel ratio for crisp rendering on high-DPI screens.
     */
    function resizeCanvas() {
      if (!canvas || !canvas.parentElement || !ctx) {
        return;
      }
      const parentWidth = canvas.parentElement.clientWidth;
      const parentHeight = canvas.parentElement.clientHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      // Set the canvas' internal resolution.
      canvas.width = parentWidth * pixelRatio;
      canvas.height = parentHeight * pixelRatio;
      // Scale drawing operations so coordinates map to CSS pixels.
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      // Match the canvas style size in CSS pixels.
      canvas.style.width = `${parentWidth}px`;
      canvas.style.height = `${parentHeight}px`;
    }

    /**
     * Renders one frame of the dot animation at a given timestamp.
     */
    function renderFrame(timestampMillis: number) {
      if (!canvas || !ctx || !canvas.parentElement) {
        return;
      }
      if (startTimeMillis === null) {
        startTimeMillis = timestampMillis;
      }
      const elapsedSeconds = (timestampMillis - startTimeMillis) / 1000;
      const parentWidth = canvas.parentElement.clientWidth || 0;
      const parentHeight = canvas.parentElement.clientHeight || 0;
      // Clear the previous frame so we can redraw fresh dots.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach(dot => {
        const cycleDuration = dot.durationSeconds;
        const localTime =
          (elapsedSeconds + dot.startOffsetSeconds) % cycleDuration;
        const loopCompletionRatio = localTime / cycleDuration;
        ctx.globalAlpha = calculateDotAlpha(loopCompletionRatio);
        // Dot travelled distance, goes from (0,0) to (distance*cos(angle), distance*sin(angle)) linearly.
        const tx = dot.distancePx * Math.cos(dot.angle) * loopCompletionRatio;
        const ty = dot.distancePx * Math.sin(dot.angle) * loopCompletionRatio;
        // Convert dot position from percentages to actual canvas coordinates.
        const x = (dot.leftPercent / 100) * parentWidth + tx;
        const y = (dot.topPercent / 100) * parentHeight + ty;
        ctx.fillStyle = '#666';
        // Draw a single pixel.
        ctx.fillRect(x, y, 1, 1);
      });
      // Reset global alpha for any subsequent operations.
      ctx.globalAlpha = 1;
      // Request the next animation frame.
      animationFrameId = requestAnimationFrame(renderFrame);
    }
    // Initialise the canvas size.
    resizeCanvas();
    // Resize canvas when window size changes.
    window.addEventListener('resize', resizeCanvas);
    // Draw the first frame immediately to avoid a "white flash."
    renderFrame(performance.now());
    // Continue the animation loop.
    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dots]);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute top-0 left-0 h-full w-full"
      style={{backgroundColor: 'transparent'}}
    />
  );
}

/**
 *
 * @param loopCompletionRatio ratio of the current animation loop.
 *      0.1 is the first 10% of the dot animation loop and 0.5 is halfway.
 *      After it becomes 1, the animation loops, so it becomes 0 shortly after.
 *
 * @returns alpha for the given time in the animation loop.
 */
function calculateDotAlpha(loopCompletionRatio: number): number {
  // Fade in first 10% and fade out last 90%.
  if (loopCompletionRatio < 0.1) {
    return loopCompletionRatio / 0.1;
  }
  return 1 - (loopCompletionRatio - 0.1) / 0.9;
}

'use client';
import {TextButton} from '@/components/ui/text-button';
import {Granularity} from '@/lib/util/Granularity';
import {formatInterval, intervalsEqual, sliceInterval} from '@/lib/util/time';
import {type Interval} from 'date-fns';

export function Navigation({
  timeline,
  granularity,
  selected,
  setSelected,
}: {
  timeline: Interval;
  granularity: Granularity;
  selected: Interval;
  setSelected: (i: Interval) => void;
}) {
  const slices: Array<Interval> = sliceInterval({
    interval: timeline,
    granularity,
  });
  return (
    <div className="space-x-2">
      {slices.map(i => {
        const current = intervalsEqual(selected, i);
        return (
          <TextButton
            key={i.start.toString()}
            tone={current ? 'accent' : 'default'}
            onClick={() => setSelected(i)}
            disabled={current}
          >
            {formatInterval(i)}
          </TextButton>
        );
      })}
    </div>
  );
}

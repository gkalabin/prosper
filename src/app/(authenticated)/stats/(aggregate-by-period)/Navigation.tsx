'use client';
import {ButtonLink} from '@/components/ui/buttons';
import {type Interval} from 'date-fns';
import {Granularity} from '@/lib/util/Granularity';
import {formatInterval, intervalsEqual, sliceInterval} from '@/lib/util/time';

export function Navigation({
  timeline,
  granularity,
  selected,
  setSelected,
}: {
  timeline: Interval<Date>;
  granularity: Granularity;
  selected: Interval<Date>;
  setSelected: (i: Interval<Date>) => void;
}) {
  const slices: Array<Interval<Date>> = sliceInterval({
    interval: timeline,
    granularity,
  });
  return (
    <div className="space-x-2">
      {slices.map(i => (
        <ButtonLink
          key={i.start.toString()}
          onClick={() => setSelected(i)}
          disabled={intervalsEqual(selected, i)}
        >
          {formatInterval(i)}
        </ButtonLink>
      ))}
    </div>
  );
}

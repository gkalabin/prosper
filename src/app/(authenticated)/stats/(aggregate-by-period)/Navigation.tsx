'use client';
import {Button} from '@/components/ui/button';
import {Granularity} from '@/lib/util/Granularity';
import {formatInterval, intervalsEqual, sliceInterval} from '@/lib/util/time';
import {type Interval} from 'date-fns';

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
        <Button
          variant="link"
          size="inherit"
          key={i.start.toString()}
          onClick={() => setSelected(i)}
          disabled={intervalsEqual(selected, i)}
        >
          {formatInterval(i)}
        </Button>
      ))}
    </div>
  );
}

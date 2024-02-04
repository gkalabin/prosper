import {type Interval} from 'date-fns';
import {MoneyTimeseries} from 'lib/util/Timeseries';

export type Props = {
  title: string;
  series: Series;
  interval: Interval;
};

// TODO: remove wrapping object if it hold only one property.
export type Series = {
  data: MoneyTimeseries;
};

export interface ChartsLibrary {
  Bar(props: Props): JSX.Element;
  Line(props: Props): JSX.Element;
}

import {type Interval} from 'date-fns';
import {Amount} from 'lib/Amount';
import {Currency} from 'lib/model/Currency';
import {Granularity} from 'lib/util/Granularity';
import {MoneyTimeseries} from 'lib/util/Timeseries';

export type Props = {
  title: string;
  series: Series;
  interval: Interval;
  // TODO: add granularity as the prop.
};

// TODO: remove wrapping object if it hold only one property.
export type Series = {
  data: MoneyTimeseries;
};

export type HorizontalBarProps = {
  title: string;
  currency: Currency;
  data: Map<string, Amount>;
};

export type NamedTimeseries = {
  name: string;
  series: MoneyTimeseries;
};

export type StackedBarProps = {
  title: string;
  currency: Currency;
  granularity: Granularity;
  interval: Interval;
  data: Array<NamedTimeseries>;
};

export interface ChartsLibrary {
  Line(props: Props): JSX.Element;
  Bar(props: Props): JSX.Element;
  StackedBar(props: StackedBarProps): JSX.Element;
  HorizontalBar(props: HorizontalBarProps): JSX.Element;
}

import {type Interval} from 'date-fns';
import {Amount} from '@/lib/Amount';
import {Currency} from '@/lib/model/Currency';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries} from '@/lib/util/Timeseries';

export type TimeseriesProps = {
  title: string;
  interval: Interval;
  granularity: Granularity;
  data: MoneyTimeseries;
};

export type HorizontalBarProps = {
  title: string;
  currency: Currency;
  data: Array<NamedAmount>;
};

export type StackedBarProps = {
  title: string;
  currency: Currency;
  granularity: Granularity;
  interval: Interval;
  data: Array<NamedTimeseries>;
};

export type NamedTimeseries = {
  name: string;
  series: MoneyTimeseries;
};

export type NamedAmount = {
  name: string;
  amount: Amount;
};

export interface ChartsLibrary {
  Line(props: TimeseriesProps): JSX.Element;
  Bar(props: TimeseriesProps): JSX.Element;
  StackedBar(props: StackedBarProps): JSX.Element;
  HorizontalBar(props: HorizontalBarProps): JSX.Element;
}

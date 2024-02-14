import {Amount} from '@/lib/Amount';
import {Currency} from '@/lib/model/Currency';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, NumberTimeseries} from '@/lib/util/Timeseries';
import {type Interval} from 'date-fns';

export type TimeseriesMoneyProps = {
  title: string;
  interval: Interval;
  granularity: Granularity;
  currency: Currency;
  data: MoneyTimeseries;
};

export type TimeseriesNumbersProps = {
  title: string;
  interval: Interval;
  granularity: Granularity;
  data: NumberTimeseries;
};

export type HorizontalBarMoneyProps = {
  title: string;
  currency: Currency;
  data: Array<NamedAmount>;
};

export type HorizontalBarNumbersProps = {
  title: string;
  data: Array<NamedNumber>;
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

export type NamedNumber = {
  name: string;
  amount: number;
};

export interface ChartsLibrary {
  Line(props: TimeseriesMoneyProps | TimeseriesNumbersProps): JSX.Element;
  Bar(props: TimeseriesMoneyProps | TimeseriesNumbersProps): JSX.Element;
  StackedBar(props: StackedBarProps): JSX.Element;
  HorizontalBar(
    props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
  ): JSX.Element;
}

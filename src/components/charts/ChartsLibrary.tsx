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

type NamedAmount = {
  name: string;
  amount: Amount;
};

type NamedNumber = {
  name: string;
  amount: number;
};

export interface ChartsLibrary {
  Line(props: TimeseriesMoneyProps | TimeseriesNumbersProps): React.JSX.Element;
  Bar(props: TimeseriesMoneyProps | TimeseriesNumbersProps): React.JSX.Element;
  StackedBar(props: StackedBarProps): React.JSX.Element;
  HorizontalBar(
    props: HorizontalBarMoneyProps | HorizontalBarNumbersProps
  ): React.JSX.Element;
}

import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import {CheckIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import {
  format,
  isEqual,
  startOfMonth,
  subMonths,
  type Interval,
} from 'date-fns';
import {Fragment} from 'react';

const now = new Date();
export const LAST_6_MONTHS: Interval = {
  start: startOfMonth(subMonths(now, 6)),
  end: now,
};
export const LAST_12_MONTHS: Interval = {
  start: startOfMonth(subMonths(now, 12)),
  end: now,
};

function useFirstTransactionMonth() {
  const {transactions} = useAllDatabaseDataContext();
  const [firstTransaction] = [...transactions].sort(
    (a, b) => a.timestampEpoch - b.timestampEpoch
  );
  return startOfMonth(firstTransaction.timestampEpoch);
}

function useCommonIntervals() {
  return [
    {
      label: 'Last 6 months',
      interval: LAST_6_MONTHS,
    },
    {
      label: 'Last 12 months',
      interval: LAST_12_MONTHS,
    },
    {
      label: 'All time',
      interval: {
        start: useFirstTransactionMonth(),
        end: now,
      },
    },
  ];
}

const formatDate = (date: Date | number | string) =>
  date ? format(date, 'yyyy-MM-dd') : '';

function intervalsEqual(i1: Interval, i2: Interval): boolean {
  return isEqual(i1.start, i2.start) && isEqual(i1.end, i2.end);
}

export function DurationSelector({
  duration,
  onChange,
}: {
  duration: Interval;
  onChange: (newInterval: Interval) => void;
}) {
  const commonIntervals = useCommonIntervals();
  const formatInterval = (i: Interval): string => {
    const common = commonIntervals.find(x => intervalsEqual(x.interval, i));
    if (common) {
      return common.label;
    }
    if (i.start && i.end) {
      return `${formatDate(i.start)} - ${formatDate(i.end)}`;
    }
    if (i.start) {
      return `After ${formatDate(i.start)}`;
    }
    if (i.end) {
      return `Before ${formatDate(i.end)}`;
    }
    return 'Never';
  };
  const firstTransactionMonth = useFirstTransactionMonth();

  return (
    <Popover className="relative">
      {({open}) => (
        <>
          <PopoverButton
            className={` ${open ? '' : 'text-opacity-90'} group inline-flex items-center rounded-md bg-indigo-700 px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
          >
            <span>Duration: {formatInterval(duration)}</span>
            <ChevronDownIcon
              className={`${open ? '' : 'text-opacity-70'} ml-2 h-5 w-5 text-indigo-300 transition duration-150 ease-in-out group-hover:text-opacity-80`}
            />
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel className="absolute left-1/2 z-10 mt-3 w-screen max-w-xs -translate-x-1/2 transform px-4 sm:px-0">
              <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="relative grid gap-8 bg-white p-7">
                  {commonIntervals.map(opt => (
                    <PopoverButton
                      key={opt.label}
                      className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-50"
                      onClick={() => onChange(opt.interval)}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        <CheckIcon
                          className={classNames(
                            intervalsEqual(duration, opt.interval)
                              ? 'visible'
                              : 'invisible',
                            'mr-2 inline h-4 w-4'
                          )}
                        />
                        {formatInterval(opt.interval)}
                      </div>
                    </PopoverButton>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-2">
                  <div className="flow-root rounded-md px-2 py-2 transition duration-150 ease-in-out">
                    <div className="gric-cols-1 grid gap-4">
                      <div className="flex items-center gap-4">
                        <Label htmlFor="from" className="w-12">
                          From
                        </Label>
                        <Input
                          id="from"
                          type="date"
                          className="grow"
                          value={formatDate(duration.start)}
                          onChange={x =>
                            onChange({
                              start: x.target.value
                                ? new Date(x.target.value)
                                : firstTransactionMonth,
                              end: duration.end,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <Label htmlFor="to" className="w-12">
                          To
                        </Label>
                        <Input
                          id="to"
                          type="date"
                          className="grow"
                          value={formatDate(duration.end)}
                          onChange={x =>
                            onChange({
                              start: duration.start,
                              end: x.target.value
                                ? new Date(x.target.value)
                                : now,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

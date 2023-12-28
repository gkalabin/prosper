import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import { Input } from "components/forms/Input";
import { format } from "date-fns";
import { commonIntervals, Interval } from "lib/Interval";
import { Fragment } from "react";

export function DurationSelector({
  duration,
  onChange,
}: {
  duration: Interval;
  onChange: (newInterval: Interval) => void;
}) {
  const dateFormat = (date: Date) => (date ? format(date, "yyyy-MM-dd") : "");
  return (
    <div className="mb-4 w-full max-w-sm">
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className={`
                ${open ? "" : "text-opacity-90"}
                group inline-flex items-center rounded-md bg-indigo-700 px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
            >
              <span>Duration: {duration.format()}</span>
              <ChevronDownIcon
                className={`${open ? "" : "text-opacity-70"}
                  ml-2 h-5 w-5 text-indigo-300 transition duration-150 ease-in-out group-hover:text-opacity-80`}
              />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-screen max-w-xs -translate-x-1/2 transform px-4 sm:px-0">
                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="relative grid gap-8 bg-white p-7">
                    {commonIntervals.map((opt) => (
                      <Popover.Button
                        key={opt.format()}
                        className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-50"
                        onClick={() => onChange(opt)}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          <CheckIcon
                            className={classNames(
                              duration.isSame(opt) ? "visible" : "invisible",
                              "mr-2 inline h-4 w-4"
                            )}
                          />
                          {opt.format()}
                        </div>
                      </Popover.Button>
                    ))}
                  </div>
                  <div className="bg-gray-50 px-4 py-2">
                    <div className="flow-root rounded-md px-2 py-2 transition duration-150 ease-in-out">
                      <div className="gric-cols-1 grid gap-4">
                        <div className="flex items-center gap-4">
                          <label
                            htmlFor="start"
                            className="w-12 text-sm font-medium text-gray-700"
                          >
                            From
                          </label>
                          <Input
                            type="date"
                            className="grow"
                            value={dateFormat(duration.start())}
                            onChange={(x) =>
                              onChange(
                                new Interval({
                                  start: new Date(x.target.value),
                                  end: duration.end(),
                                })
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label
                            htmlFor="start"
                            className="w-12 text-sm font-medium  text-gray-700"
                          >
                            To
                          </label>
                          <Input
                            type="date"
                            className="grow"
                            value={dateFormat(duration.end())}
                            onChange={(x) =>
                              onChange(
                                new Interval({
                                  start: duration.start(),
                                  end: new Date(x.target.value),
                                })
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
}

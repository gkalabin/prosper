import {Input} from '@/components/forms/Input';
import {Select, undoTailwindInputStyles} from '@/components/forms/Select';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {fullAccountName} from '@/lib/model/BankAccount';
import {
  getNameWithAncestors,
  immediateChildren,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {mustFindTagByName} from '@/lib/model/Tag';
import {Trip} from '@/lib/model/Trip';
import {
  Transaction,
  isExpense,
  isIncome,
  otherPartyNameOrNull,
  transactionHasTrip,
} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {notEmpty} from '@/lib/util/util';
import {Switch} from '@headlessui/react';
import classNames from 'classnames';
import {differenceInMonths, isBefore} from 'date-fns';
import {useMemo, useState} from 'react';
import {Controller, useFormContext} from 'react-hook-form';
import ReactSelect from 'react-select';
import CreatableSelect from 'react-select/creatable';

export const ExpenseForm = ({
  transaction,
  prototype,
}: {
  transaction: Transaction | null;
  prototype: TransactionPrototype | null;
}) => {
  const {
    register,
    formState: {isSubmitting},
    getValues,
    setValue,
  } = useFormContext<TransactionFormSchema>();
  const [isShared, setIsShared] = useState(false);
  const [paidMysef, setPaidMyself] = useState(true);
  const [alreadyRepaid, setAlreadyRepaid] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  const {transactions} = useAllDatabaseDataContext();
  const otherParties = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  const vendors = uniqMostFrequent(
    transactions
      .map(x => {
        if (isExpense(x)) {
          return x.vendor;
        }
        if (isIncome(x)) {
          return x.payer;
        }
        return null;
      })
      .filter(notEmpty)
  );

  return (
    <>
      <div className="col-span-6">
        <label
          htmlFor="timestamp"
          className="block text-sm font-medium text-gray-700"
        >
          Time
        </label>
        <Input
          type="datetime-local"
          className="block w-full"
          disabled={isSubmitting}
          {...register('expense.timestamp')}
        />
      </div>

      {paidMysef && (
        <div className="col-span-6">
          <label
            htmlFor="accountId"
            className="block text-sm font-medium text-gray-700"
          >
            I paid for this expense from
          </label>
          <Select
            className="block w-full"
            disabled={isSubmitting}
            {...register('expense.accountId', {
              valueAsNumber: true,
            })}
          >
            {accounts.map(x => (
              <option key={x.id} value={x.id}>
                {fullAccountName(x, banks)}
              </option>
            ))}
          </Select>

          <div className="text-xs">
            or{' '}
            <ButtonLink
              onClick={() => {
                setPaidMyself(false);
                setIsShared(true);
              }}
            >
              someone else paid for this expense
            </ButtonLink>
            .
          </div>
        </div>
      )}

      {!paidMysef && (
        <div className="col-span-6">
          <label
            htmlFor="payer"
            className="block text-sm font-medium text-gray-700"
          >
            Who paid for the expense
          </label>
          <Input
            type="text"
            list="companions"
            className="block w-full"
            {...register('expense.payer')}
          />
          <div className="text-xs">
            or{' '}
            <ButtonLink onClick={() => setPaidMyself(true)}>
              I paid for this myself
            </ButtonLink>
            .
          </div>
        </div>
      )}

      <div className="col-span-3 flex">
        <Switch.Group>
          <div className="flex items-center">
            <div className="flex">
              <Switch
                checked={isShared}
                onChange={() => setIsShared(!isShared)}
                className={classNames(
                  isShared ? 'bg-indigo-700' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full disabled:opacity-30'
                )}
                disabled={isSubmitting || !paidMysef}
              >
                <span
                  className={`${
                    isShared ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
            <div className="ml-4 text-sm">
              <Switch.Label className="font-medium text-gray-700">
                Split transaction
              </Switch.Label>
            </div>
          </div>
        </Switch.Group>
      </div>
      {isShared && (
        <div className="col-span-3">
          {paidMysef && (
            <>
              <label
                htmlFor="otherPartyName"
                className="block text-sm font-medium text-gray-700"
              >
                Shared with
              </label>
              <Input
                type="text"
                list="companions"
                className="block w-full"
                {...register('expense.companion')}
              />
              <datalist id="companions">
                {otherParties.map(v => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          )}
        </div>
      )}

      <div className={classNames(isShared ? 'col-span-3' : 'col-span-6')}>
        <label
          htmlFor="amountCents"
          className="block text-sm font-medium text-gray-700"
        >
          Amount
        </label>
        <Controller
          name="expense.amount"
          render={({field}) => (
            <Input
              {...field}
              type="text"
              inputMode="decimal"
              className="block w-full"
              onFocus={e => e.target.select()}
              onChange={e =>
                field.onChange(parseTextInputAsNumber(e.target.value))
              }
              disabled={isSubmitting}
            />
          )}
        />
      </div>

      {isShared && (
        <div className="col-span-3">
          <label
            htmlFor="ownShareAmountCents"
            className="block text-sm font-medium text-gray-700"
          >
            I owe {getValues('expense.payer') || 'them'}
          </label>
          <Controller
            name="expense.ownShareAmount"
            render={({field}) => (
              <Input
                {...field}
                type="text"
                inputMode="decimal"
                className="block w-full"
                onFocus={e => e.target.select()}
                onChange={e =>
                  field.onChange(parseTextInputAsNumber(e.target.value))
                }
                disabled={isSubmitting}
              />
            )}
          />
          {!alreadyRepaid && (
            <div className="text-xs">
              or{' '}
              <ButtonLink onClick={() => setAlreadyRepaid(true)}>
                I&apos;ve already paid them back
              </ButtonLink>
              .
            </div>
          )}
          {alreadyRepaid && (
            <div className="text-xs">
              or{' '}
              <ButtonLink onClick={() => setAlreadyRepaid(false)}>
                I owe them money
              </ButtonLink>
              .
            </div>
          )}
        </div>
      )}

      {alreadyRepaid && (
        <div className="col-span-6">
          <label
            htmlFor="accountId"
            className="block text-sm font-medium text-gray-700"
          >
            I&apos;ve repaid {getValues('expense.payer') || 'them'} from
          </label>
          <Select
            className="block w-full"
            disabled={isSubmitting}
            {...register('expense.repaiedFromAccountId', {
              valueAsNumber: true,
            })}
          >
            {accounts.map(x => (
              <option key={x.id} value={x.id}>
                {fullAccountName(x, banks)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isShared && (
        <div className="col-span-6">
          {paidMysef && (
            <>
              I paid {getValues('expense.amount')} and{' '}
              {getValues('expense.companion')} owes me{' '}
              {getValues('expense.amount') -
                getValues('expense.ownShareAmount')}
              .
            </>
          )}
        </div>
      )}

      <div className="col-span-6">
        <label
          htmlFor="vendor"
          className="block text-sm font-medium text-gray-700"
        >
          Vendor
        </label>
        <Input
          type="text"
          list="vendors"
          className="block w-full"
          {...register('expense.vendor')}
        />
        <datalist id="vendors">
          {vendors.map(v => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      <Tags />
      <Category />
      <div className="col-span-6 text-xs">
        Add a{' '}
        <ButtonLink
          onClick={() => {
            setShowNote(!showNote);
            setValue('expense.description', '');
          }}
        >
          note
        </ButtonLink>{' '}
        to this transaction or link it to a{' '}
        <ButtonLink
          onClick={() => {
            setShowTrip(!showTrip);
            setValue('expense.tripName', '');
          }}
        >
          trip
        </ButtonLink>
        .
      </div>
      {showTrip && <Trips />}
      {showNote && <Description />}
    </>
  );
};

const MAX_MOST_FREQUENT = 5;
export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const {categories, transactions} = useAllDatabaseDataContext();
  const vendor = getValues('expense.vendor') ?? '';
  const mostFrequentIds = useMemo(
    () => mostFrequentCategories(transactions, vendor),
    [transactions, vendor]
  );
  const mostFrequent = mostFrequentIds
    .map(id => categories.find(c => c.id == id))
    .filter(notEmpty);
  const categoryTree = makeCategoryTree(categories);
  const categoriesWithoutChildren = categories.filter(
    c => immediateChildren(c, categoryTree).length == 0
  );
  const options = [
    {
      label: 'Most Frequently Used',
      options: mostFrequent.slice(0, MAX_MOST_FREQUENT),
    },
    {
      label: 'Children Categories',
      options: categoriesWithoutChildren,
    },
    {
      label: 'All Categories',
      options: categories,
    },
  ];
  const tree = makeCategoryTree(categories);
  return (
    <div className="col-span-6">
      <label
        className="block text-sm font-medium text-gray-700"
        htmlFor="categoryId"
      >
        Category
      </label>
      <Controller
        name="expense.categoryId"
        control={control}
        render={({field}) => (
          <ReactSelect
            instanceId="categoryId"
            styles={undoTailwindInputStyles()}
            options={options}
            getOptionLabel={c => getNameWithAncestors(c, tree)}
            getOptionValue={c => getNameWithAncestors(c, tree)}
            {...field}
            value={mustFindCategory(field.value, categories)}
            onChange={newValue => field.onChange(newValue!.id)}
            isDisabled={field.disabled}
          />
        )}
      />
    </div>
  );
}

function appendNew(target: number[], newItems: number[]): number[] {
  const existing = new Set(target);
  const newUnseen = newItems.filter(x => !existing.has(x));
  return [...target, ...newUnseen];
}

function mostFrequentCategories(
  allTransactions: Transaction[],
  vendor: string
): number[] {
  const expenses = allTransactions.filter(isExpense);
  const matching = expenses.filter(x => !vendor || x.vendor == vendor);
  const now = new Date();
  const matchingRecent = matching.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  // Start with categories for recent transactions matching vendor.
  let result = uniqMostFrequent(matchingRecent.map(t => t.categoryId));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // Expand to all transactions matching vendor.
  result = appendNew(result, uniqMostFrequent(matching.map(t => t.categoryId)));
  if (result.length >= MAX_MOST_FREQUENT) {
    return result;
  }
  // At this stage, just add all categories for recent transactions.
  const recent = expenses.filter(
    x => differenceInMonths(now, x.timestampEpoch) <= 3
  );
  return appendNew(result, uniqMostFrequent(recent.map(t => t.categoryId)));
}

function Tags() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions, tags} = useAllDatabaseDataContext();
  const tagFrequency = new Map<number, number>(tags.map(x => [x.id, 0]));
  transactions
    .flatMap(x => x.tagsIds)
    .forEach(x => tagFrequency.set(x, (tagFrequency.get(x) ?? 0) + 1));
  const allTags = [...tags].sort(
    (t1, t2) => (tagFrequency.get(t2.id) ?? 0) - (tagFrequency.get(t1.id) ?? 0)
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="tagNames"
        className="block text-sm font-medium text-gray-700"
      >
        Tags
      </label>
      <Controller
        name="expense.tagNames"
        control={control}
        render={({field}) => (
          <CreatableSelect
            instanceId="tagNames"
            isMulti
            styles={undoTailwindInputStyles()}
            options={allTags}
            getOptionLabel={c => c.name}
            getOptionValue={c => c.name}
            isDisabled={field.disabled}
            {...field}
            value={field.value.map(n => mustFindTagByName(n, allTags))}
            onChange={tags => field.onChange(tags.map(x => x.name))}
          />
        )}
      />
    </div>
  );
}

function Description() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const descriptions = uniqMostFrequent(
    transactions.map(x => x.note).filter(notEmpty)
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="description"
        className="block text-sm font-medium text-gray-700"
      >
        Description
      </label>
      <Input
        type="text"
        list="descriptions"
        className="block w-full"
        {...register('expense.description')}
      />
      <datalist id="descriptions">
        {descriptions.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

function Trips() {
  const {register} = useFormContext<TransactionFormSchema>();
  const {transactions, trips} = useAllDatabaseDataContext();
  const transactionsWithTrips = transactions.filter(transactionHasTrip);
  const tripLastUsageDate = new Map<number, number>();
  transactionsWithTrips.forEach(x => {
    const existing = tripLastUsageDate.get(x.tripId);
    if (!existing || isBefore(existing, x.timestampEpoch)) {
      tripLastUsageDate.set(x.tripId, x.timestampEpoch);
    }
  });
  const tripById = new Map<number, Trip>(trips.map(x => [x.id, x]));
  const tripIdsByLastUsageDate = [...tripLastUsageDate.entries()]
    .sort(([_k1, ts1], [_k2, ts2]) => ts2 - ts1)
    .map(([tripId]) => tripId);
  const tripNames = tripIdsByLastUsageDate.map(
    x => tripById.get(x)?.name ?? 'Unknown trip'
  );
  return (
    <div className="col-span-6">
      <label
        htmlFor="tripName"
        className="block text-sm font-medium text-gray-700"
      >
        Trip
      </label>
      <Input
        type="text"
        list="tripNames"
        className="block w-full"
        {...register('expense.tripName')}
      />
      <datalist id="tripNames">
        {tripNames.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

// TODO: write tests
function parseTextInputAsNumber(v: string): number | string {
  const normalised = v.replace(/,/g, '.');
  const match = normalised.match(/^[0-9]+(\.[0-9]+)?$/);
  if (!match) {
    return v;
  }
  return +normalised;
}

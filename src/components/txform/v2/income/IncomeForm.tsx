import {Input} from '@/components/forms/Input';
import {Select, undoTailwindInputStyles} from '@/components/forms/Select';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {shortRelativeDate} from '@/lib/TimeHelpers';
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
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {
  Transaction,
  formatAmount,
  isExpense,
  isIncome,
  otherPartyNameOrNull,
} from '@/lib/model/transaction/Transaction';
import {TransactionPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {notEmpty} from '@/lib/util/util';
import {Switch} from '@headlessui/react';
import classNames from 'classnames';
import {differenceInMonths} from 'date-fns';
import {useMemo, useState} from 'react';
import {Controller, useFormContext} from 'react-hook-form';
import ReactSelect from 'react-select';
import Async from 'react-select/async';
import CreatableSelect from 'react-select/creatable';

export const IncomeForm = ({
  transaction,
  prototype,
}: {
  transaction: Transaction | null;
  prototype: TransactionPrototype | null;
}) => {
  const {
    register,
    formState: {isSubmitting},
    setValue,
  } = useFormContext<TransactionFormSchema>();
  const [isShared, setIsShared] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showParent, setShowParent] = useState(false);
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  const {transactions} = useAllDatabaseDataContext();
  const otherParties = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );
  const payers = uniqMostFrequent(
    transactions.map(x => (isIncome(x) ? x.payer : null)).filter(notEmpty)
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
          {...register('income.timestamp')}
        />
      </div>

      <div className="col-span-6">
        <label
          htmlFor="accountId"
          className="block text-sm font-medium text-gray-700"
        >
          Received To
        </label>
        <Select
          className="block w-full"
          disabled={isSubmitting}
          {...register('income.accountId', {
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

      <div className="col-span-3 flex">
        <Switch.Group>
          <div className="flex items-center">
            <div className="flex">
              <Switch
                checked={isShared}
                onChange={() => setIsShared(!isShared)}
                className={classNames(
                  isShared ? 'bg-indigo-700' : 'bg-gray-200',
                  isSubmitting ? 'opacity-30' : '',
                  'relative inline-flex h-6 w-11 items-center rounded-full'
                )}
                disabled={isSubmitting}
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
            {...register('income.companion')}
          />
          <datalist id="companions">
            {otherParties.map(v => (
              <option key={v} value={v} />
            ))}
          </datalist>
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
          name="income.amount"
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
            Your share
          </label>
          <Controller
            name="income.ownShareAmount"
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
      )}

      <div className="col-span-6">
        <label
          htmlFor="payer"
          className="block text-sm font-medium text-gray-700"
        >
          Payer
        </label>
        <Input
          type="text"
          list="payers"
          className="block w-full"
          {...register('income.payer')}
        />
        <datalist id="payers">
          {payers.map(v => (
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
            setValue('income.description', '');
          }}
        >
          note
        </ButtonLink>{' '}
        to this transaction or{' '}
        <ButtonLink
          onClick={() => {
            setShowParent(!showParent);
            setValue('income.parentTransactionId', null);
          }}
        >
          link the transaction this is the refund for
        </ButtonLink>
        .
      </div>
      {showParent && <ParentTransaction />}
      {showNote && <Description />}
    </>
  );
};

const MAX_MOST_FREQUENT = 5;
export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const {categories, transactions} = useAllDatabaseDataContext();
  const payer = getValues('income.payer') ?? '';
  const mostFrequentIds = useMemo(
    () => mostFrequentCategories(transactions, payer),
    [transactions, payer]
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
      <label className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <Controller
        name="income.categoryId"
        control={control}
        render={({field}) => (
          <ReactSelect
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
  const {
    formState: {isSubmitting},
    setValue,
    getValues,
  } = useFormContext<TransactionFormSchema>();
  const {transactions, tags} = useAllDatabaseDataContext();
  const tagFrequency = new Map<number, number>(tags.map(x => [x.id, 0]));
  transactions
    .flatMap(x => x.tagsIds)
    .forEach(x => tagFrequency.set(x, (tagFrequency.get(x) ?? 0) + 1));
  const tagsByFrequency = [...tags].sort(
    (t1, t2) => (tagFrequency.get(t2.id) ?? 0) - (tagFrequency.get(t1.id) ?? 0)
  );
  const makeOption = (x: string) => ({label: x, value: x});
  return (
    <div className="col-span-6">
      <label
        htmlFor="tagNames"
        className="block text-sm font-medium text-gray-700"
      >
        Tags
      </label>
      <CreatableSelect
        isMulti
        styles={undoTailwindInputStyles()}
        options={tagsByFrequency.map(x => makeOption(x.name))}
        value={getValues('income.tagNames').map(x => makeOption(x))}
        onChange={newValue =>
          setValue(
            'income.tagNames',
            newValue.map(x => x.value)
          )
        }
        isDisabled={isSubmitting}
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
        {...register('income.description')}
      />
      <datalist id="descriptions">
        {descriptions.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

function ParentTransaction() {
  const {
    formState: {isSubmitting},
    setValue,
    getValues,
  } = useFormContext<TransactionFormSchema>();
  const {transactions, bankAccounts, stocks} = useAllDatabaseDataContext();
  const parentTransactionId = getValues('income.parentTransactionId');
  const parentTransaction =
    transactions.find(t => t.id == parentTransactionId) ?? null;
  const parentExpense =
    parentTransaction?.kind == 'PersonalExpense' ? parentTransaction : null;
  const makeTransactionLabel = (t: PersonalExpense): string =>
    `${formatAmount(t, bankAccounts, stocks)} ${t.vendor} ${shortRelativeDate(
      t.timestampEpoch
    )}`;
  const makeOption = (t: PersonalExpense) => ({
    label: makeTransactionLabel(t),
    value: t.id,
  });
  const accountId = getValues('income.accountId');
  return (
    <div className="col-span-6">
      <label className="block text-sm font-medium text-gray-700">
        Parent transaction
      </label>
      <Async
        styles={undoTailwindInputStyles()}
        isClearable
        loadOptions={async (input: string) => {
          return transactions
            .filter((t): t is PersonalExpense => t.kind == 'PersonalExpense')
            .filter(t => t.vendor.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 40)
            .map(makeOption);
        }}
        defaultOptions={transactions
          .filter((t): t is PersonalExpense => t.kind == 'PersonalExpense')
          .filter(t => t.accountId == accountId)
          .filter(t => differenceInMonths(new Date(), t.timestampEpoch) < 3)
          .map(makeOption)}
        value={{
          label: parentExpense ? makeTransactionLabel(parentExpense) : 'None',
          value: parentTransactionId,
        }}
        onChange={newValue =>
          setValue('income.parentTransactionId', newValue?.value ?? null)
        }
        isDisabled={isSubmitting}
      />
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

import {undoTailwindInputStyles} from '@/components/forms/Select';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {
  Category as CategoryModel,
  getNameWithAncestors,
  immediateChildren,
  makeCategoryTree,
  mustFindCategory,
} from '@/lib/model/Category';
import {Transaction, isExpense} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {differenceInMonths} from 'date-fns';
import {useMemo} from 'react';
import {Controller, useFormContext} from 'react-hook-form';
import ReactSelect from 'react-select';

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
  const tree = makeCategoryTree(categories);
  const categoriesWithoutChildren = categories.filter(
    c => immediateChildren(c, tree).length == 0
  );
  const toOption = (c: CategoryModel) => ({
    value: c.id,
    label: getNameWithAncestors(c, tree),
  });
  const options = [
    {
      label: 'Most Frequently Used',
      options: mostFrequent.slice(0, MAX_MOST_FREQUENT).map(toOption),
    },
    {
      label: 'Children Categories',
      options: categoriesWithoutChildren.map(toOption),
    },
    {
      label: 'All Categories',
      options: categories.map(toOption),
    },
  ];
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
            isDisabled={field.disabled}
            {...field}
            value={
              field.value
                ? toOption(mustFindCategory(field.value, categories))
                : null
            }
            onChange={newValue => field.onChange(newValue!.value)}
          />
        )}
      />
    </div>
  );
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

function appendNew(target: number[], newItems: number[]): number[] {
  const existing = new Set(target);
  const newUnseen = newItems.filter(x => !existing.has(x));
  return [...target, ...newUnseen];
}

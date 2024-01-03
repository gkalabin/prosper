import {FormikInput} from 'components/forms/Input';
import {undoTailwindInputStyles} from 'components/forms/Select';
import {ButtonFormSecondary} from 'components/ui/buttons';
import {format} from 'date-fns';
import {useFormikContext} from 'formik';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {fullAccountName} from 'lib/model/BankAccount';
import {Tag} from 'lib/model/Tag';
import {Trip} from 'lib/model/Trip';
import {Transaction} from 'lib/model/transaction/Transaction';
import {QuerySyntaxError, fallbackSearch, search} from 'lib/search/search';
import {notEmpty} from 'lib/util/util';
import {useEffect} from 'react';
import Select from 'react-select';

type TransactionType = 'personal' | 'external' | 'transfer' | 'income';

export type FiltersFormValues = {
  query: string;
  transactionTypes: TransactionType[];
  vendor: string;
  timeFrom: string;
  timeTo: string;
  accountIds: number[];
  categoryIds: number[];
  tripId: number | undefined;
  tagIds: number[];
  allTagsShouldMatch: boolean;
};
export const initialTransactionFilters: FiltersFormValues = {
  query: '',
  transactionTypes: [],
  vendor: '',
  timeFrom: '',
  timeTo: '',
  accountIds: [],
  categoryIds: [],
  tripId: undefined,
  tagIds: [],
  allTagsShouldMatch: false,
};

function generateQuery({
  formValues,
  trips,
  tags,
}: {
  formValues: Omit<FiltersFormValues, 'query'>;
  trips: Trip[];
  tags: Tag[];
}) {
  const {
    transactionTypes,
    vendor,
    accountIds,
    categoryIds,
    tripId,
    timeFrom,
    timeTo,
    tagIds,
    allTagsShouldMatch,
  } = formValues;
  const parts: string[] = [];
  const appendOR = (...or: (string | undefined)[]) => {
    const values = or.filter(notEmpty).filter(x => x.trim().length > 0);
    if (values.length > 1) {
      parts.push(`(${values.join(' OR ')})`);
    } else {
      parts.push(...values);
    }
  };
  appendOR(...transactionTypes.map(tt => `t:${tt}`));
  appendOR(vendor && `vendor:${vendor}`);
  appendOR(...accountIds.map(id => `account:${id}`));
  appendOR(...categoryIds.map(id => `c:${id}`));
  if (tripId) {
    const trip = trips.find(t => t.id == tripId);
    appendOR(trip && `trip:"${trip.name}"`);
  }
  appendOR(timeFrom && `date>=${format(new Date(timeFrom), 'yyyy-MM-dd')}`);
  appendOR(timeTo && `date<=${format(new Date(timeTo), 'yyyy-MM-dd')}`);
  if (tagIds.length > 0) {
    const tagSet = new Set(tagIds);
    const selectedTags = tags.filter(t => tagSet.has(t.id));
    const tagParts = selectedTags.map(t => `tag:${t.name}`);
    if (tagParts.length > 1 && !allTagsShouldMatch) {
      parts.push(`(${tagParts.join(' OR ')})`);
    } else {
      parts.push(...tagParts);
    }
  }
  return parts.join(' ');
}

export function useFilteredTransactions(): {
  results: Transaction[];
  error?: QuerySyntaxError;
} {
  const {transactions, banks, bankAccounts, categories, trips, tags} =
    useAllDatabaseDataContext();
  const {
    values: {
      query,
      transactionTypes,
      vendor,
      accountIds,
      categoryIds,
      tripId,
      timeFrom,
      timeTo,
      tagIds,
      allTagsShouldMatch,
    },
    setFieldValue,
  } = useFormikContext<FiltersFormValues>();

  // update query input with the generated query when any of the other fields change
  useEffect(() => {
    const generated = generateQuery({
      formValues: {
        transactionTypes,
        vendor,
        accountIds,
        categoryIds,
        tripId,
        timeFrom,
        timeTo,
        tagIds,
        allTagsShouldMatch,
      },
      trips,
      tags,
    });
    setFieldValue('query', generated);
  }, [
    transactionTypes,
    vendor,
    accountIds,
    categoryIds,
    tripId,
    timeFrom,
    timeTo,
    tagIds,
    allTagsShouldMatch,
    trips,
    tags,
    setFieldValue,
  ]);

  try {
    const results = search(
      query,
      transactions,
      banks,
      bankAccounts,
      categories,
      trips,
      tags
    );
    return {results};
  } catch (e) {
    if (e instanceof QuerySyntaxError) {
      const fallbackResults = fallbackSearch(
        query,
        transactions,
        banks,
        bankAccounts,
        categories,
        trips,
        tags
      );
      return {results: fallbackResults, error: e};
    } else {
      throw e;
    }
  }
}

export function SearchForAnythingInput() {
  return (
    <>
      <label
        htmlFor="query"
        className="block text-sm font-medium text-gray-700"
      >
        Search for anything
      </label>
      <FormikInput name="query" className="block w-full" />
    </>
  );
}

export function TransactionFiltersForm(props: {onClose: () => void}) {
  const {banks, bankAccounts, categories, trips, tags} =
    useAllDatabaseDataContext();
  const {
    values: {transactionTypes, accountIds, categoryIds, tripId, tagIds},
    setFieldValue,
  } = useFormikContext<FiltersFormValues>();
  const bankAccountOptions = bankAccounts.map(a => ({
    value: a.id,
    label: `${fullAccountName(a, banks)}` + (a.archived ? ' (archived)' : ''),
  }));
  const bankAccountOptionByValue = new Map<
    number,
    {value: number; label: string}
  >(bankAccountOptions.map(x => [x.value, x]));

  const categoryOptions = categories.map(a => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const categoryOptionByValue = new Map<number, {value: number; label: string}>(
    categoryOptions.map(x => [x.value, x])
  );

  const tripOptions = trips.map(a => ({
    value: a.id,
    label: a.name,
  }));

  const tagIdOptions = tags.map(t => ({
    value: t.id,
    label: t.name,
  }));

  const transactionTypeOptions: {value: TransactionType; label: string}[] = [
    {value: 'personal', label: 'Personal'},
    {value: 'external', label: 'External'},
    {value: 'transfer', label: 'Transfer'},
    {value: 'income', label: 'Income'},
  ];
  return (
    <>
      <div className="grid grid-cols-6 gap-6 bg-white p-2 shadow sm:rounded-md sm:p-6">
        <div className="col-span-6 text-xl font-medium leading-7">Filters</div>
        <div className="col-span-6">
          <label
            htmlFor="transactionTypes"
            className="block text-sm font-medium text-gray-700"
          >
            Transaction types
          </label>
          <Select
            instanceId={'transactionTypes'}
            styles={undoTailwindInputStyles()}
            options={transactionTypeOptions}
            isMulti
            value={transactionTypes.map(tt => ({
              label:
                transactionTypeOptions.find(({value}) => value == tt)?.label ??
                'unknown',
              value: tt,
            }))}
            onChange={x =>
              setFieldValue(
                'transactionTypes',
                x.map(x => x.value)
              )
            }
          />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="vendor"
            className="block text-sm font-medium text-gray-700"
          >
            Vendor
          </label>
          <FormikInput name="vendor" className="block w-full" />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="accountIds"
            className="block text-sm font-medium text-gray-700"
          >
            Account
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={bankAccountOptions}
            isMulti
            value={accountIds.map(x => ({
              label: bankAccountOptionByValue.get(x)?.label ?? 'unknown',
              value: x,
            }))}
            onChange={x =>
              setFieldValue(
                'accountIds',
                x.map(x => x.value)
              )
            }
          />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="categoryIds"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={categoryOptions}
            isMulti
            value={categoryIds.map(x => ({
              label: categoryOptionByValue.get(x)?.label ?? 'unknown',
              value: x,
            }))}
            onChange={x =>
              setFieldValue(
                'categoryIds',
                x.map(x => x.value)
              )
            }
          />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="timeFrom"
            className="block text-sm font-medium text-gray-700"
          >
            From
          </label>
          <FormikInput name="timeFrom" type="date" className="block w-full" />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="timeTo"
            className="block text-sm font-medium text-gray-700"
          >
            To
          </label>
          <FormikInput name="timeTo" type="date" className="block w-full" />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="tripId"
            className="block text-sm font-medium text-gray-700"
          >
            Trip
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={tripOptions}
            value={tripOptions.find(x => x.value == tripId)}
            onChange={x => setFieldValue('tripId', x?.value)}
          />
        </div>
        <div className="col-span-6">
          <label
            htmlFor="tagIds"
            className="block text-sm font-medium text-gray-700"
          >
            Tags
          </label>
          <Select
            styles={undoTailwindInputStyles()}
            options={tagIdOptions}
            isMulti
            value={tagIds.map(x => ({
              label: tags.find(t => t.id == x)?.name ?? 'unknown',
              value: x,
            }))}
            onChange={x =>
              setFieldValue(
                'tagIds',
                x.map(x => x.value)
              )
            }
          />
          <div className="ml-2 block">
            <label
              htmlFor="allTagsShouldMatch"
              className="text-sm font-medium text-gray-700"
            >
              Transaction should have all selected tags
            </label>
            <FormikInput
              name="allTagsShouldMatch"
              type="checkbox"
              className="ml-2"
            />
          </div>
        </div>

        <div className="col-span-6">
          <ButtonFormSecondary onClick={props.onClose}>
            Close
          </ButtonFormSecondary>
        </div>
      </div>
    </>
  );
}

import {MultiSelect} from '@/components/MultiSelect';
import {
  FiltersFormSchema,
  TransactionType,
} from '@/components/transactions/filters/FiltersFormSchema';
import {Button} from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Checkbox} from '@/components/ui/html-checkbox';
import {Input} from '@/components/ui/input';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {fullAccountName} from '@/lib/model/BankAccount';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';
import {cn} from '@/lib/utils';
import {useFormContext} from 'react-hook-form';

export function SearchForAnythingInput() {
  const {control} = useFormContext<FiltersFormSchema>();
  return (
    <FormField
      control={control}
      name="query"
      render={({field}) => (
        <FormItem>
          <FormLabel>Search For Anything</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TransactionFiltersForm(props: {onClose: () => void}) {
  const {
    banks,
    bankAccounts,
    categories: allCategories,
    trips,
    tags,
  } = useCoreDataContext();
  const {control} = useFormContext<FiltersFormSchema>();
  const bankAccountOptions = bankAccounts.map(a => ({
    value: a.id,
    label: `${fullAccountName(a, banks)}` + (a.archived ? ' (archived)' : ''),
  }));
  const tree = makeCategoryTree(allCategories);
  const categoryOptions = allCategories.map(c => ({
    value: c.id,
    label: getNameWithAncestors(c, tree),
  }));
  const tripOptions = trips.map(t => ({
    value: t.name,
    label: t.name,
  }));
  const tagOptions = tags.map(t => ({
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
    <div className="grid grid-cols-6 gap-6 bg-white p-2 shadow sm:rounded-md sm:p-6">
      <div className="col-span-6 text-xl font-medium leading-7">Filters</div>
      <FormField
        control={control}
        name="transactionTypes"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Transaction Type</FormLabel>
            <FormControl>
              <MultiSelect options={transactionTypeOptions} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="vendor"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Vendor</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="accountIds"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Account</FormLabel>
            <FormControl>
              <MultiSelect options={bankAccountOptions} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="categoryIds"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Category</FormLabel>
            <FormControl>
              <MultiSelect options={categoryOptions} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="timeFrom"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>From</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="timeTo"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>To</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="tripNames"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Trip</FormLabel>
            <FormControl>
              <MultiSelect options={tripOptions} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="tagIds"
        render={({field}) => (
          <FormItem className="col-span-6">
            <FormLabel>Tag</FormLabel>
            <FormControl>
              <MultiSelect options={tagOptions} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="allTagsShouldMatch"
        render={({field}) => (
          <FormItem className="col-span-6 flex flex-row gap-4">
            <FormControl className="w-4">
              <Checkbox
                checked={field.value}
                onChange={e => field.onChange(e.target.checked)}
              />
            </FormControl>
            <FormLabel className="grow">Match all tags</FormLabel>
          </FormItem>
        )}
      />

      <div className="col-span-6">
        <Button onClick={props.onClose} variant="secondary">
          Close
        </Button>
      </div>
    </div>
  );
}

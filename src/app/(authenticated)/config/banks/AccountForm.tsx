import {upsertBankAccount} from '@/actions/config/bank-account';
import {UnitSelect} from '@/app/(authenticated)/config/banks/UnitSelect';
import {Button} from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Checkbox} from '@/components/ui/html-checkbox';
import {Input} from '@/components/ui/input';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  AccountFormSchema,
  accountFormValidationSchema,
  UnitSchema,
} from '@/lib/form-types/AccountFormSchema';
import {AddOrUpdateButtonText} from '@/lib/i18n';
import {Bank, BankAccount} from '@/lib/model/BankAccount';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {setFormErrors} from '@/lib/util/forms';
import {zodResolver} from '@hookform/resolvers/zod';
import {BankAccount as DBBankAccount} from '@prisma/client';
import {useForm} from 'react-hook-form';

export function AccountForm({
  bank,
  bankAccount,
  bankAccounts,
  stocks,
  onAddedOrUpdated,
  onClose,
}: {
  bankAccount?: BankAccount;
  bankAccounts: BankAccount[];
  bank: Bank;
  stocks: Stock[];
  onAddedOrUpdated: (x: DBBankAccount) => void;
  onClose: () => void;
}) {
  const addingNewAccount = !bankAccount;
  const initialValues = useInitialFormValues(
    bank,
    bankAccounts,
    stocks,
    bankAccount
  );
  const form = useForm<AccountFormSchema>({
    resolver: zodResolver(accountFormValidationSchema),
    defaultValues: initialValues,
  });

  const handleSubmit = async (values: AccountFormSchema) => {
    try {
      const result = await upsertBankAccount(
        bankAccount ? bankAccount.id : null,
        values
      );
      if (result.status === 'SUCCESS') {
        onAddedOrUpdated(result.data);
        return;
      }
      setFormErrors(result.errors, form.setError);
    } catch (error) {
      form.setError('root', {message: `Failed to save account: ${error}`});
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <h3 className="mb-2 text-xl font-medium leading-5">
          {addingNewAccount
            ? 'Add New Bank Account'
            : `Edit ${bankAccount.name}`}
        </h3>

        <FormField
          control={form.control}
          name="name"
          render={({field}) => (
            <FormItem>
              <FormLabel>Bank Account Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({field}) => (
            <FormItem>
              <FormLabel>Account currency or stock</FormLabel>
              <FormControl>
                <UnitSelect
                  stocks={stocks}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={field.disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialBalance"
          render={({field}) => (
            <FormItem>
              <FormLabel>Initial balance</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isJoint"
          render={({field}) => (
            <FormItem className="col-span-6 flex flex-row gap-4">
              <FormControl className="w-4">
                <Checkbox
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                />
              </FormControl>
              <FormLabel className="grow">Joint account</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isArchived"
          render={({field}) => (
            <FormItem className="col-span-6 flex flex-row gap-4">
              <FormControl className="w-4">
                <Checkbox
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                />
              </FormControl>
              <FormLabel className="grow">Archived account</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-2">
          <div className="text-sm font-medium text-destructive">
            {form.formState.errors.root?.message}
          </div>
          <div className="flex-none space-x-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <AddOrUpdateButtonText add={!bankAccount} />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function useDefaultUnitValue() {
  const displayCurrency = useDisplayCurrency();
  return {kind: 'currency' as const, currencyCode: displayCurrency.code};
}

function useInitialFormValues(
  bank: Bank,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  bankAccount?: BankAccount
): AccountFormSchema {
  const defaultUnit = useDefaultUnitValue();
  if (!bankAccount) {
    return {
      name: '',
      unit: defaultUnit,
      isJoint: false,
      isArchived: false,
      initialBalance: 0,
      displayOrder: 100 * bankAccounts.filter(a => a.bankId == bank.id).length,
      bankId: bank.id,
    };
  }

  let unit: UnitSchema;
  if (bankAccount.stockId) {
    const stock = stocks.find(s => s.id === bankAccount.stockId);
    if (!stock) {
      throw new Error(
        `BankAccount ${bankAccount.id} has stockId ${bankAccount.stockId} but it does not exist`
      );
    }
    unit = {
      kind: 'stock',
      ticker: stock.ticker,
      exchange: stock.exchange,
      name: stock.name,
    };
  } else if (bankAccount.currencyCode) {
    unit = {
      kind: 'currency',
      currencyCode: mustFindByCode(bankAccount.currencyCode).code,
    };
  } else {
    throw new Error(
      `BankAccount ${bankAccount.id} does not have a stock or currency`
    );
  }
  return {
    name: bankAccount.name,
    unit,
    isJoint: bankAccount.joint,
    isArchived: bankAccount.archived,
    initialBalance: bankAccount.initialBalanceCents / 100,
    displayOrder: bankAccount.displayOrder,
    bankId: bank.id,
  };
}

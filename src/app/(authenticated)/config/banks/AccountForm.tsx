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
import {zodResolver} from '@hookform/resolvers/zod';
import {BankAccount as DBBankAccount} from '@prisma/client';
import {useState} from 'react';
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
  const [apiError, setApiError] = useState('');
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
    setApiError('');
    try {
      const body = {
        ...values,
        bankId: bank.id,
      };
      const added = await fetch(
        `/api/config/bank-account/${addingNewAccount ? '' : bankAccount.id}`,
        {
          method: addingNewAccount ? 'POST' : 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(body),
        }
      );
      if (!added.ok) {
        setApiError(
          `Failed to add: ${await added.text()} (code ${added.status})`
        );
        return;
      }
      onAddedOrUpdated(await added.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <h3 className="mb-2 text-xl leading-5 font-medium">
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

        {apiError && (
          <div className="text-destructive text-sm font-medium">{apiError}</div>
        )}

        <div className="flex flex-row justify-end gap-2">
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

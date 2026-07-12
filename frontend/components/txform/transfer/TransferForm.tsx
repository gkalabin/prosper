import {AccountSelect} from '@/components/txform/shared/Account';
import {Category} from '@/components/txform/shared/Category';
import {Description} from '@/components/txform/shared/Description';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Tags} from '@/components/txform/shared/Tags';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {UpdateCategoryOnDescriptionChange} from '@/components/txform/shared/UpdateCategoryOnChange';
import {
  Amount,
  useAccountUnitsEqual,
} from '@/components/txform/transfer/Amount';
import {AmountReceived} from '@/components/txform/transfer/AmountReceived';
import {UpdateReceivedAmountOnAmountChange} from '@/components/txform/transfer/UpdateReceivedAmountOnAmountChange';
import {SubFormValues, TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  accountBank,
  accountUnit,
  mustFindBankAccount,
} from '@/lib/model/BankAccount';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {isCurrency} from '@/lib/model/Unit';
import {ArrowRightIcon} from '@heroicons/react/24/outline';
import {useFormContext, useWatch} from 'react-hook-form';

export function TransferForm({transaction}: {transaction: Transaction | null}) {
  const {getValues} = useFormContext<TransactionFormSchema>();
  assertDefined(
    getValues('transfer'),
    'transfer form requires transfer values'
  );
  const isCreatingNewTransaction = !transaction;
  return (
    <>
      <Timestamp fieldName="transfer.timestamp" />
      <MoveMoneyAccounts />
      <Amount />
      <AmountReceived />
      <NewBalancesNote transaction={transaction} />
      <ImpliedExchangeRate />
      <Description
        fieldName="transfer.description"
        label="Description"
        placeholder="e.g. Moving to savings"
      />
      <Category fieldName="transfer.categoryId" />
      <Tags fieldName="transfer.tagNames" />

      {/* When editing transactions, do not update the category automatically:
      the user might not notice the change and unintentionally recategorise the
      transaction when they only mean to change the description. */}
      {isCreatingNewTransaction && <UpdateCategoryOnDescriptionChange />}
      <UpdateReceivedAmountOnAmountChange />
    </>
  );
}

// The from and to account dropdowns side by side with an arrow in between,
// each carrying a small caption on the field border.
function MoveMoneyAccounts() {
  const {control} = useFormContext<SubFormValues>();
  return (
    <div className="col-span-6 space-y-1.5">
      <div className="text-muted-foreground text-xs font-semibold">
        Move money
      </div>
      <div className="flex items-stretch gap-2">
        <FormField
          control={control}
          name="transfer.fromAccountId"
          render={({field}) => (
            <FormItem className="relative flex-1">
              <span className="text-muted-foreground bg-card pointer-events-none absolute left-3 top-1 z-10 px-0.5 text-[10px] font-bold uppercase tracking-wide">
                From
              </span>
              <FormControl>
                <AccountSelect
                  aria-label="From account"
                  {...field}
                  className="h-12 rounded-md px-3 pt-3 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ArrowRightIcon className="text-muted-foreground h-4 w-4 flex-none self-center" />
        <FormField
          control={control}
          name="transfer.toAccountId"
          render={({field}) => (
            <FormItem className="relative flex-1">
              <span className="text-muted-foreground bg-card pointer-events-none absolute left-3 top-1 z-10 px-0.5 text-[10px] font-bold uppercase tracking-wide">
                To
              </span>
              <FormControl>
                <AccountSelect
                  aria-label="To account"
                  {...field}
                  className="h-12 rounded-md px-3 pt-3 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function NewBalancesNote({transaction}: {transaction: Transaction | null}) {
  return (
    <>
      <div className="col-span-6">
        <NewBalanceFrom transaction={transaction} />
      </div>
      <div className="col-span-6">
        <NewBalanceTo transaction={transaction} />
      </div>
    </>
  );
}

function useBankName(accountId: number): string {
  const {bankAccounts, banks} = useCoreDataContext();
  const account = mustFindBankAccount(bankAccounts, accountId);
  return accountBank(account, banks).name;
}

function NewBalanceFrom({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountSent', exact: true});
  const accountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  const bankName = useBankName(accountId);
  return (
    <NewBalanceNote
      text={`New ${bankName} balance`}
      amount={-amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

function NewBalanceTo({transaction}: {transaction: Transaction | null}) {
  const amount = useWatch({name: 'transfer.amountReceived', exact: true});
  const accountId = useWatch({name: 'transfer.toAccountId', exact: true});
  const bankName = useBankName(accountId);
  return (
    <NewBalanceNote
      text={`New ${bankName} balance`}
      amount={amount}
      accountId={accountId}
      transaction={transaction}
    />
  );
}

// Shows the exchange rate implied by the entered sent and received amounts of
// a cross-currency transfer.
function ImpliedExchangeRate() {
  const {bankAccounts, stocks} = useCoreDataContext();
  const sameUnit = useAccountUnitsEqual();
  const amountSent = Number(
    useWatch({name: 'transfer.amountSent', exact: true})
  );
  const amountReceived = Number(
    useWatch({name: 'transfer.amountReceived', exact: true})
  );
  const fromAccountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  const toAccountId = useWatch({name: 'transfer.toAccountId', exact: true});
  if (sameUnit || !(amountSent > 0) || !(amountReceived > 0)) {
    return null;
  }
  const fromUnit = accountUnit(
    mustFindBankAccount(bankAccounts, fromAccountId),
    stocks
  );
  const toUnit = accountUnit(
    mustFindBankAccount(bankAccounts, toAccountId),
    stocks
  );
  if (!isCurrency(fromUnit) || !isCurrency(toUnit)) {
    return null;
  }
  return (
    <div className="text-muted-foreground col-span-6 text-xs">
      Implied rate 1 {fromUnit.code} ={' '}
      {(amountReceived / amountSent).toFixed(4)} {toUnit.code}
    </div>
  );
}

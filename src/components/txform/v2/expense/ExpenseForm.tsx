import {Input} from '@/components/forms/Input';
import {undoTailwindInputStyles} from '@/components/forms/Select';
import {AccountFrom} from '@/components/txform/v2/expense/AccountFrom';
import {Category} from '@/components/txform/v2/expense/Category';
import {Companion} from '@/components/txform/v2/expense/Companion';
import {ExtraFields} from '@/components/txform/v2/expense/ExtraFields';
import {Payer} from '@/components/txform/v2/expense/Payer';
import {RepaymentFields} from '@/components/txform/v2/expense/RepaymentFields';
import {Timestamp} from '@/components/txform/v2/expense/Timestamp';
import {Vendor} from '@/components/txform/v2/expense/Vendor';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {ButtonLink} from '@/components/ui/buttons';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {Switch} from '@headlessui/react';
import classNames from 'classnames';
import {Controller, useFormContext} from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';

export const ExpenseForm = () => {
  return (
    <>
      <Timestamp fieldName="expense.timestamp" />
      <AccountFrom />
      <Payer />
      <SplitTransactionToggle />
      <Companion />
      <Amount />
      <OwnShareAmount />
      <RepaymentFields />
      <Vendor />
      <Tags />
      <Category />
      <ExtraFields />
    </>
  );
};

function Amount() {
  const {
    formState: {isSubmitting},
    watch,
  } = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const shared =
    'PAID_SELF_SHARED' == share ||
    'PAID_OTHER_OWED' == share ||
    'PAID_OTHER_REPAID' == share;
  return (
    <div className={classNames(shared ? 'col-span-3' : 'col-span-6')}>
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
  );
}

function OwnShareAmount() {
  const {
    formState: {isSubmitting},
    getValues,
    watch,
  } = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const shared =
    'PAID_SELF_SHARED' == share ||
    'PAID_OTHER_OWED' == share ||
    'PAID_OTHER_REPAID' == share;
  if (!shared) {
    return <></>;
  }
  return (
    <div className="col-span-3">
      <label
        htmlFor="ownShareAmountCents"
        className="block text-sm font-medium text-gray-700"
      >
        {share == 'PAID_SELF_SHARED' && <>My share</>}
        {share == 'PAID_OTHER_OWED' && (
          <>My share (which I owe {getValues('expense.payer') || 'them'})</>
        )}
        {share == 'PAID_OTHER_REPAID' && <>My share (which I paid back)</>}
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
      <RepaymentToggle />
    </div>
  );
}

function RepaymentToggle() {
  const {getValues, setValue, watch} = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  return (
    <>
      {share == 'PAID_OTHER_OWED' && (
        <div className="text-xs">
          or{' '}
          <ButtonLink
            onClick={() => {
              setValue('expense.shareType', 'PAID_OTHER_REPAID');
              setValue(
                'expense.repayment.accountId',
                getValues('expense.accountId') ?? 0
              );
              setValue(
                'expense.repayment.timestamp',
                getValues('expense.timestamp')
              );
            }}
          >
            I&apos;ve already paid them back
          </ButtonLink>
          .
        </div>
      )}
      {share == 'PAID_OTHER_REPAID' && (
        <div className="text-xs">
          or{' '}
          <ButtonLink
            onClick={() => {
              setValue('expense.shareType', 'PAID_OTHER_OWED');
              setValue(
                'expense.accountId',
                getValues('expense.repayment.accountId') ?? 0
              );
            }}
          >
            I owe them money
          </ButtonLink>
          .
        </div>
      )}
    </>
  );
}

function SplitTransactionToggle() {
  const {
    formState: {isSubmitting},
    getValues,
    setValue,
    watch,
  } = useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const shared =
    'PAID_SELF_SHARED' == share ||
    'PAID_OTHER_OWED' == share ||
    'PAID_OTHER_REPAID' == share;
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
  const paidOther = !paidSelf;
  const {transactions} = useAllDatabaseDataContext();
  const [mostFrequentCompanion] = uniqMostFrequent(
    transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
  );

  return (
    <div className="col-span-3 flex">
      <Switch.Group>
        <div className="flex items-center">
          <div className="flex">
            <Switch
              checked={shared}
              onChange={() => {
                if (share == 'PAID_SELF_SHARED') {
                  setValue('expense.shareType', 'PAID_SELF_NOT_SHARED');
                  setValue('expense.companion', null);
                  setValue(
                    'expense.ownShareAmount',
                    getValues('expense.amount')
                  );
                }
                if (share == 'PAID_SELF_NOT_SHARED') {
                  setValue('expense.shareType', 'PAID_SELF_SHARED');
                  setValue('expense.companion', mostFrequentCompanion ?? '');
                  setValue(
                    'expense.ownShareAmount',
                    getValues('expense.amount') / 2
                  );
                }
              }}
              className={classNames(
                shared ? 'bg-indigo-700' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 items-center rounded-full disabled:opacity-30'
              )}
              disabled={isSubmitting || paidOther}
            >
              <span
                className={`${shared ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}
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
  );
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
  const options = allTags.map(t => ({value: t.name, label: t.name}));
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
            options={options}
            isDisabled={field.disabled}
            {...field}
            value={field.value.map(v => ({label: v, value: v}))}
            onChange={tags => {
              field.onChange(tags.map(t => t.value));
              console.log(
                'set',
                tags.map(t => t.value)
              );
            }}
          />
        )}
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

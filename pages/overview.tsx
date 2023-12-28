import Layout from "components/Layout";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { TransactionsList } from "components/transactions/TransactionsList";
import { AddTransactionForm } from "components/txform/AddTransactionForm";
import { AnchorLink, ButtonPagePrimary } from "components/ui/buttons";
import { differenceInDays } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Bank, BankAccount } from "lib/model/BankAccount";
import {
  useOpenBankingBalances,
  useOpenBankingExpirations,
  useOpenBankingTransactions,
} from "lib/openbanking/context";
import { allDbDataProps } from "lib/ServerSideDB";
import { onTransactionChange } from "lib/stateHelpers";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";

const BankAccountListItem = (props: { account: BankAccount }) => {
  const [showTransactionList, setShowTransactionList] = useState(false);
  let balanceText = <span>{props.account.balance().format()}</span>;
  const { balances } = useOpenBankingBalances();
  const { setDbData } = useAllDatabaseDataContext();
  const obBalance = balances?.find(
    (b) => b.internalAccountId === props.account.id
  );
  if (obBalance) {
    const obAmount = new AmountWithCurrency({
      amountCents: obBalance.balanceCents,
      currency: props.account.currency,
    });
    const delta = props.account.balance().subtract(obAmount);
    if (delta.isZero()) {
      balanceText = (
        <span className="text-green-600">
          {props.account.balance().format()}
        </span>
      );
    } else {
      balanceText = (
        <>
          <span className="text-red-600">
            {props.account.balance().format()}
          </span>{" "}
          {delta.abs().format()} unaccounted{" "}
          {delta.isNegative() ? "income" : "expense"}
        </>
      );
    }
  }
  return (
    <div className="flex flex-col py-2 pl-6 pr-2">
      <div
        className="cursor-pointer"
        onClick={() => setShowTransactionList(!showTransactionList)}
      >
        <span className="text-base font-normal">{props.account.name}</span>
        <span className="ml-2 text-sm font-light">{balanceText}</span>
      </div>
      {showTransactionList && (
        <div className="mt-4">
          <TransactionsList
            transactions={props.account.transactions}
            onTransactionUpdated={onTransactionChange(setDbData)}
            showBankAccountInStatusLine={false}
          />
        </div>
      )}
    </div>
  );
};

const BanksList = ({ banks }: { banks: Bank[] }) => {
  return (
    <div className="space-y-4">
      {banks.map((bank) => (
        <BanksListItem key={bank.id} bank={bank} />
      ))}
    </div>
  );
};

const BanksListItem = ({ bank }: { bank: Bank }) => {
  const displayCurrency = useDisplayCurrency();
  const { expirations } = useOpenBankingExpirations();
  const expiration = expirations?.find(
    (e) => e.bankId == bank.id
  )?.expirationEpoch;
  const now = new Date();
  const expiresInDays = differenceInDays(expiration, now);
  const dayOrDays = Math.abs(expiresInDays) == 1 ? "day" : "days";
  return (
    <div className="rounded border">
      <div className="border-b bg-indigo-200 p-2">
        <div className="text-xl font-medium text-gray-900">
          {bank.name}
          <span className="ml-2">{bank.balance(displayCurrency).format()}</span>
        </div>
        {expiration && (
          <div className="text-sm font-light text-gray-700">
            OpenBanking connection{" "}
            {(expiresInDays > 0 && (
              <>
                expires in {expiresInDays} {dayOrDays}
              </>
            )) || (
              <>
                has expired {-expiresInDays} {dayOrDays} ago
              </>
            )}
            .{" "}
            <AnchorLink href={`/api/open-banking/reconnect?bankId=${bank.id}`}>
              Reconnect
            </AnchorLink>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {bank.accounts
          .filter((a) => !a.isArchived())
          .map((account) => (
            <BankAccountListItem key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

function OverviewPageContent() {
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const displayCurrency = useDisplayCurrency();
  const { banks, exchange, setDbData } = useAllDatabaseDataContext();

  const accounts = banks.flatMap((b) => b.accounts);
  const now = new Date();
  const zero = new AmountWithCurrency({
    amountCents: 0,
    currency: displayCurrency,
  });
  const total = accounts.reduce(
    (acc, account) =>
      acc.add(exchange.exchange(account.balance(), displayCurrency, now)),
    zero
  );
  const totalLiquid = accounts
    .filter((a) => a.isLiquid())
    .reduce(
      (acc, account) =>
        acc.add(exchange.exchange(account.balance(), displayCurrency, now)),
      zero
    );
  const { isError: obBalancesError, isLoading: obBalancesLoading } =
    useOpenBankingBalances();
  // Just trigger the loading of transactions, so they are cached for later.
  useOpenBankingTransactions();
  return (
    <Layout className="space-y-4">
      <div className="rounded border">
        <h2 className="bg-indigo-300 p-2 text-2xl font-medium text-gray-900">
          Total {total.format()}
        </h2>
        <div className="grid grid-cols-2">
          <span className="pl-3 text-lg font-medium">Cash</span>{" "}
          {totalLiquid.format()}
          <span className="pl-3 text-lg font-medium">Equity</span>{" "}
          {total.subtract(totalLiquid).format()}
        </div>
      </div>
      <div className="mb-4">
        {!showAddTransactionForm && (
          <div className="flex justify-end">
            <ButtonPagePrimary onClick={() => setShowAddTransactionForm(true)}>
              New Transaction
            </ButtonPagePrimary>
          </div>
        )}
        {showAddTransactionForm && (
          <AddTransactionForm
            onAddedOrUpdated={onTransactionChange(setDbData)}
            onClose={() => setShowAddTransactionForm(false)}
          />
        )}
      </div>
      {obBalancesError && (
        <div className="rounded border bg-red-100 p-2 text-lg font-medium text-gray-900">
          Error loading Open Banking balances
        </div>
      )}
      {obBalancesLoading && (
        <div className="rounded border bg-yellow-50 p-2 text-base font-normal text-gray-900">
          Loading Open Banking balances...
        </div>
      )}
      <BanksList banks={banks} />
    </Layout>
  );
}

export const getServerSideProps = allDbDataProps;
export default function OverviewPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <OverviewPageContent />
    </AllDatabaseDataContextProvider>
  );
}

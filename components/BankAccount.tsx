import React from "react";

export type BankAccountProps = {
  id: string;
  name: string;
  currency: {
    name: string;
  };
};

const BankAccount: React.FC<{ account: BankAccountProps }> = ({ account }) => {
  return (
    <div>
      <h2>{account.name}</h2>
      <small>{account.currency.name}</small>
    </div>
  );
};

export default BankAccount;

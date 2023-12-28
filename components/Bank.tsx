import React from "react";
import BankAccount, { BankAccountProps } from "./BankAccount";

export type BankProps = {
  id: string;
  name: string;
  accounts: Array<BankAccountProps>;
};

const Bank: React.FC<{ bank: BankProps }> = ({ bank }) => {
  console.log(bank.accounts);

  let content;
  if (!bank.accounts) {
    content = (
      <div>{bank.name} has no accounts.</div>
      
    );
  }

  console.log(content);

  return (
    <div>
      <h2>{bank.name}</h2>
      {bank.accounts?.map((account) => (
        <div key={account.id}>
          <BankAccount account={account} />
        </div>
      ))}
      {content}
    </div>
  );
};

export default Bank;

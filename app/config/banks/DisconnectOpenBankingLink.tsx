import { AnchorLink } from "components/ui/buttons";
import { Bank } from "lib/model/BankAccount";

export function DisconnectOpenBankingLink({ bank }: { bank: Bank }) {
  return (
    <AnchorLink
      className="text-red-600 hover:text-red-500"
      href={`/api/open-banking/disconnect?bankId=${bank.id}`}
    >
      Disconnect
    </AnchorLink>
  );
}

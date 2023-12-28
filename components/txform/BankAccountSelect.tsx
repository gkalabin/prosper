import { SelectNumber } from "components/txform/Select";
import { FieldHookConfig } from "formik";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";

export const BankAccountSelect = (
  props: FieldHookConfig<number> & { label: string }
) => {
  const { banks } = useAllDatabaseDataContext();
  const accounts = banks
    .flatMap((x) => x.accounts)
    .filter((x) => !x.isArchived());
  return (
    <SelectNumber {...props}>
      {accounts.map((x) => (
        <option key={x.id} value={x.id}>
          {x.bank.name} {x.name}
        </option>
      ))}
    </SelectNumber>
  );
};

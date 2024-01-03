import {LabelledInputProps} from 'components/forms/Input';
import {SelectNumber} from 'components/txform/Select';
import {useDisplayBankAccounts} from 'lib/model/AllDatabaseDataModel';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {fullAccountName} from 'lib/model/BankAccount';

export const BankAccountSelect = (
  props: React.InputHTMLAttributes<HTMLSelectElement> & LabelledInputProps
) => {
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  return (
    <SelectNumber {...props}>
      {accounts.map(x => (
        <option key={x.id} value={x.id}>
          {fullAccountName(x, banks)}
        </option>
      ))}
    </SelectNumber>
  );
};

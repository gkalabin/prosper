import {Bank as DBBank} from '@prisma/client';
import {InputWithLabel} from '@/components/forms/Input';
import {
  AddOrUpdateButtonText,
  FormikButtonFormPrimary,
  FormikButtonFormSecondary,
} from '@/components/ui/buttons';
import {Form, Formik} from 'formik';
import {Bank} from '@/lib/model/BankAccount';
import {BankFormValues} from '@/lib/model/forms/BankFormValues';
import {useState} from 'react';

export const AddOrEditBankForm = ({
  bank,
  displayOrder,
  onAddedOrUpdated,
  onCancelClick,
}: {
  bank?: Bank;
  displayOrder: number;
  onAddedOrUpdated: (x: DBBank) => void;
  onCancelClick: () => void;
}) => {
  const [apiError, setApiError] = useState('');
  const isCreate = !bank;

  const handleSubmit = async (values: BankFormValues) => {
    setApiError('');
    try {
      const dbDbank = await fetch(
        `/api/config/bank/${isCreate ? '' : bank.id}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...values}),
        }
      );
      onAddedOrUpdated(await dbDbank.json());
    } catch (error) {
      setApiError(`Failed to add: ${error}`);
    }
  };

  let initialValues: BankFormValues = {
    name: '',
    displayOrder,
  };
  if (bank) {
    initialValues = {
      name: bank.name,
      displayOrder: bank.displayOrder,
    };
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      <Form className="flex flex-col gap-4">
        <div>
          <InputWithLabel name="name" label="Bank Name" autoFocus />
        </div>
        <div>
          <InputWithLabel
            name="displayOrder"
            label="Display order"
            type="number"
          />
        </div>
        <div className="flex flex-row justify-end gap-2">
          <FormikButtonFormSecondary onClick={onCancelClick}>
            Cancel
          </FormikButtonFormSecondary>
          <FormikButtonFormPrimary type="submit">
            <AddOrUpdateButtonText add={isCreate} />
          </FormikButtonFormPrimary>
        </div>

        <div>{apiError && <span>{apiError}</span>}</div>
      </Form>
    </Formik>
  );
};

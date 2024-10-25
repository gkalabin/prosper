import {useFormContext} from 'react-hook-form';

export const AddOrUpdateButtonText = ({add}: {add: boolean}) => {
  const {formState} = useFormContext();
  if (add) {
    return <>{formState.isSubmitting ? 'Adding…' : 'Add'}</>;
  }
  return <>{formState.isSubmitting ? 'Updating…' : 'Update'}</>;
};

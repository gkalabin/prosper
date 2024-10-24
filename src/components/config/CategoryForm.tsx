import {Button} from '@/components/ui/button';
import {AddOrUpdateButtonText} from '@/components/ui/buttons';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {Input} from '@/components/ui/input';
import {
  CategoryFormSchema,
  categoryFormValidationSchema,
} from '@/lib/form-types/CategoryFormSchema';
import {
  Category,
  getNameWithAncestors,
  makeCategoryTree,
} from '@/lib/model/Category';
import {zodResolver} from '@hookform/resolvers/zod';
import {Category as DBCategory} from '@prisma/client';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

export const CategoryForm = ({
  category,
  categories,
  onAddedOrUpdated,
  onClose,
}: {
  category?: Category;
  categories: Category[];
  onAddedOrUpdated: (addedOrUpdated: DBCategory) => void;
  onClose: () => void;
}) => {
  const [apiError, setApiError] = useState('');
  const handleSubmit = async (values: CategoryFormSchema) => {
    setApiError('');
    try {
      const response = await fetch(
        `/api/config/category/${category?.id ?? ''}`,
        {
          method: category ? 'PUT' : 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(values),
        }
      );
      onAddedOrUpdated(await response.json());
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
  };

  const form = useForm<CategoryFormSchema>({
    resolver: zodResolver(categoryFormValidationSchema),
    defaultValues: {
      name: category?.name ?? '',
      displayOrder: category?.displayOrder ?? categories.length * 100,
      parentCategoryId: category?.parentCategoryId ?? undefined,
    },
  });
  const categoryTree = makeCategoryTree(categories);
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({field}) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayOrder"
          render={({field}) => (
            <FormItem>
              <FormLabel>Display order (smaller on top)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentCategoryId"
          render={({field}) => (
            <FormItem>
              <FormLabel>Parent Category</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="null">No parent</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {getNameWithAncestors(category, categoryTree)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <AddOrUpdateButtonText add={!category} />
          </Button>
        </div>
        {apiError && (
          <div className="text-sm font-medium text-destructive">{apiError}</div>
        )}
      </form>
    </Form>
  );
};

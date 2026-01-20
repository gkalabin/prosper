import {upsertCategory} from '@/actions/config/category';
import {Button} from '@/components/ui/button';
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
import {AddOrUpdateButtonText} from '@/lib/i18n';
import {
  Category,
  getNameWithAncestors,
  makeCategoryTree,
} from '@/lib/model/Category';
import {setFormErrors} from '@/lib/util/forms';
import {zodResolver} from '@hookform/resolvers/zod';
import {Category as DBCategory} from '@prisma/client';
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
  const handleSubmit = async (values: CategoryFormSchema) => {
    try {
      const result = await upsertCategory(category?.id ?? null, values);
      if (result.status === 'SUCCESS') {
        onAddedOrUpdated(result.data);
        return;
      }
      setFormErrors(result.errors, form.setError);
    } catch (error) {
      form.setError('root', {message: `Failed to save category: ${error}`});
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
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value, 10))}
                />
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
                <Select
                  {...field}
                  value={field.value?.toString()}
                  onChange={e => {
                    field.onChange(parseInt(e.target.value, 10) || undefined);
                  }}
                >
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
        <div className="flex justify-between gap-2">
          <div className="text-sm font-medium text-destructive">
            {form.formState.errors.root?.message}
          </div>
          <div className="flex-none space-x-4">
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
        </div>
      </form>
    </Form>
  );
};

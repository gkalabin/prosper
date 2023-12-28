export type CategoryFormValues = {
  name: string;
  displayOrder: number;
  parentCategoryId?: number;
};

export type CreateCategoryRequest = CategoryFormValues;

export type UpdateCategoryRequest = CategoryFormValues;

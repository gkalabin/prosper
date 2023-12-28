type CategoryProps = {
  id: string;
  name: string;
  nameWithAncestors: string;
  isRoot: boolean;
  displayOrder: number;
  parentCategoryId?: number;
  children: CategoryProps[];
};

export default CategoryProps;

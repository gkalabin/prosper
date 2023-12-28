type Category = {
  id: string;
  name: string;
  nameWithAncestors: string;
  isRoot: boolean;
  displayOrder: number;
  parentCategoryId?: number;
  children: Category[];
};

export default Category;

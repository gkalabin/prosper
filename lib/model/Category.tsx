export type Category = {
  id: number;
  name: string;
  nameWithAncestors: string;
  isRoot: boolean;
  depth: number;
  displayOrder: number;
  parentCategoryId?: number;
  children: Category[];
};

export type DbCategory = {
  id: number;
  name: string;
  parentCategoryId?: number;
  displayOrder: number;
};

const inOrderTreeTraversal = (
  subtree: Category[],
  output: Category[],
  depth: number
) => {
  if (subtree.length == 0) {
    return;
  }
  subtree.forEach((c) => {
    c.depth = depth;
    output.push(c);
    inOrderTreeTraversal(c.children, output, depth + 1);
  });
};

export const makeCategoryTree = (dbCategories: DbCategory[]): Category[] => {
  const categories = dbCategories.map((c) =>
    Object.assign({}, c, {
      nameWithAncestors: c.name,
      isRoot: !c.parentCategoryId,
      depth: 0,
      children: [] as Category[],
    })
  );
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  categories.forEach((c) => {
    if (!c.parentCategoryId) {
      return;
    }
    let parent = categoryById[c.parentCategoryId];
    parent.children.push(c);
    const ancestorNames = [c.name];
    while (parent) {
      ancestorNames.push(parent.name);
      if (!parent.parentCategoryId) {
        break;
      }
      parent = categoryById[parent.parentCategoryId];
    }
    c.nameWithAncestors = ancestorNames.reverse().join(" > ");
  });
  categories.sort((c1, c2) => c1.displayOrder - c2.displayOrder);
  categories.forEach((c) =>
    c.children.sort((c1, c2) => c1.displayOrder - c2.displayOrder)
  );

  // Sort categories to get the list like:
  //  - A
  //  - A > Sub A
  //  - B
  //  - B > Sub B
  const categoriesSorted = [] as Category[];
  const rootCategories = categories.filter((c) => c.isRoot);
  inOrderTreeTraversal(rootCategories, categoriesSorted, 0);
  return categoriesSorted;
};

export default Category;

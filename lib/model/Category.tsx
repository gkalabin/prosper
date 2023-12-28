import { Category as DBCategory } from "@prisma/client";

export class Category {
  private readonly _id: number;
  private readonly _name: string;
  private readonly _displayOrder: number;
  private readonly _parentCategoryId?: number;
  private readonly _dbValue: DBCategory;

  _ancestors: Category[] = [];
  private _immediateParent?: Category;
  _immediateChildren: Category[] = [];

  _setImmediateParent(parent: Category) {
    if (this._parentCategoryId != parent.id()) {
      throw new Error(
        `Category ${this._id} has parent ${
          this._parentCategoryId
        } but was set to ${parent.id()}`
      );
    }
    this._immediateParent = parent;
  }

  constructor(init: DBCategory) {
    this._id = init.id;
    this._name = init.name;
    this._parentCategoryId = init.parentCategoryId;
    this._displayOrder = init.displayOrder;
    this._dbValue = init;
  }

  id() {
    return this._id;
  }

  parentCategoryId() {
    return this._parentCategoryId;
  }

  displayOrder() {
    return this._displayOrder;
  }

  name() {
    return this._name;
  }

  nameWithAncestors() {
    if (this.isRoot()) {
      return this.name();
    }
    return [...this._ancestors, this].map((a) => a.name()).join(" > ");
  }

  isRoot() {
    return !this._parentCategoryId;
  }

  depth() {
    return this._ancestors.length;
  }

  parent() {
    if (this.isRoot()) {
      throw new Error(`Category ${this._id} is root`);
    }
    return this._immediateParent;
  }

  children() {
    return this._immediateChildren;
  }

  childOf(categoryId: number) {
    return this._ancestors.some((a) => a.id() == categoryId);
  }
}

export const categoryModelFromDB = (dbCategories: DBCategory[]): Category[] => {
  const categories = dbCategories.map((c) => new Category(c));
  const categoryById = new Map<number, Category>(
    categories.map((c) => [c.id(), c])
  );
  categories
    .filter((c) => c.parentCategoryId())
    .forEach((c) => {
      let parent = categoryById.get(c.parentCategoryId());
      c._setImmediateParent(parent);
      parent._immediateChildren.push(c);
      while (parent) {
        c._ancestors.unshift(parent);
        if (!parent.parentCategoryId()) {
          break;
        }
        parent = categoryById.get(parent.parentCategoryId());
      }
    });

  // Sort categories by display order
  categories.sort((c1, c2) => c1.displayOrder() - c2.displayOrder());
  categories.forEach((c) =>
    c._immediateChildren.sort((c1, c2) => c1.displayOrder() - c2.displayOrder())
  );
  // Sort categories to get the list like:
  //  - A
  //  - A > Sub A
  //  - B
  //  - B > Sub B
  const categoriesSorted: Category[] = [];
  const rootCategories = categories.filter((c) => c.isRoot());
  const inOrderTreeTraversal = (subtree: Category[]) => {
    subtree.forEach((c) => {
      categoriesSorted.push(c);
      inOrderTreeTraversal(c.children());
    });
  };
  inOrderTreeTraversal(rootCategories);
  return categoriesSorted;
};

import {Category as DBCategory} from '@prisma/client';

export class Category {
  private readonly _id: number;
  private readonly _name: string;
  private readonly _displayOrder: number;
  private readonly _parentCategoryId?: number;

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
    this._parentCategoryId = init.parentCategoryId ?? undefined;
    this._displayOrder = init.displayOrder;
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
    return [...this._ancestors, this].map(a => a.name()).join(' > ');
  }

  isRoot() {
    return !this._parentCategoryId;
  }

  root() {
    if (this.isRoot()) {
      return this;
    }
    return this._ancestors[0];
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
}

export const categoryModelFromDB = (dbCategories: DBCategory[]): Category[] => {
  const categories = dbCategories.map(c => new Category(c));
  const categoryById = new Map<number, Category>(
    categories.map(c => [c.id(), c])
  );
  categories.forEach(c => {
    let parentId = c.parentCategoryId();
    if (!parentId) {
      return;
    }
    let parent = categoryById.get(parentId);
    if (!parent) {
      throw new Error(`Cannot find parent ${parentId} for category ${c.id()}`);
    }
    c._setImmediateParent(parent);
    parent._immediateChildren.push(c);
    while (parent) {
      c._ancestors.unshift(parent);
      parentId = parent.parentCategoryId();
      if (!parentId) {
        break;
      }
      parent = categoryById.get(parentId);
    }
  });

  // Sort categories by display order
  categories.sort((c1, c2) => c1.displayOrder() - c2.displayOrder());
  categories.forEach(c =>
    c._immediateChildren.sort((c1, c2) => c1.displayOrder() - c2.displayOrder())
  );
  // Sort categories to get the list like:
  //  - A
  //  - A > Sub A
  //  - B
  //  - B > Sub B
  const categoriesSorted: Category[] = [];
  const rootCategories = categories.filter(c => c.isRoot());
  const inOrderTreeTraversal = (subtree: Category[]) => {
    subtree.forEach(c => {
      categoriesSorted.push(c);
      inOrderTreeTraversal(c.children());
    });
  };
  inOrderTreeTraversal(rootCategories);
  return categoriesSorted;
};

export function subtreeIncludes(
  subtreeRoot: Category,
  maybeDescendant: Category,
  all: Category[]
): boolean {
  if (subtreeRoot.id() == maybeDescendant.id()) {
    return true;
  }
  return descendants(subtreeRoot, all).some(
    c => c.id() == maybeDescendant.id()
  );
}

export function ancestors(c: Category, all: Category[]): Category[] {
  const ancestors: Category[] = [];
  let parentId = c.parentCategoryId();
  while (parentId) {
    const parent = mustFindCategory(parentId, all);
    ancestors.push(parent);
    parentId = parent.parentCategoryId();
  }
  return ancestors;
}

export function immediateChildren(
  target: Category,
  all: Category[]
): Category[] {
  return all.filter(x => x.parentCategoryId() == target.id());
}

export function descendants(target: Category, all: Category[]): Category[] {
  const descendants = immediateChildren(target, all);
  const needToCheckChildren = [...descendants];
  let next = needToCheckChildren.pop();
  while (next) {
    const nextChildren = immediateChildren(next, all);
    descendants.push(...nextChildren);
    needToCheckChildren.push(...nextChildren);
    next = needToCheckChildren.pop();
  }
  return descendants;
}

export function mustFindCategory(
  cid: number,
  categories: Category[]
): Category {
  const c = categories.find(c => c.id() == cid);
  if (!c) {
    throw new Error(`Category ${cid} is not found`);
  }
  return c;
}

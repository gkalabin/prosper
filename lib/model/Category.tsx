import {Category as DBCategory} from '@prisma/client';
import {assertDefined} from 'lib/assert';

export class Category {
  private readonly _id: number;
  private readonly _name: string;
  private readonly _displayOrder: number;
  private readonly _parentCategoryId?: number;

  _immediateChildren: Category[] = [];

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

  isRoot() {
    return !this._parentCategoryId;
  }
}

export type CategoryTree = {
  tree: CategoryTreeNode[];
  nodeLookup: Map<number, CategoryTreeNode>;
};
export type CategoryTreeNode = {
  category: Category;
  parent: CategoryTreeNode | null;
  children: CategoryTreeNode[];
};

export function makeCategoryTree(all: Category[]): CategoryTree {
  const nodes: CategoryTreeNode[] = all.map(root => ({
    category: root,
    parent: null,
    children: [],
  }));
  const tree: CategoryTreeNode[] = nodes.filter(n => n.category.isRoot());
  const nodeLookup = new Map<number, CategoryTreeNode>(
    nodes.map(n => [n.category.id(), n])
  );
  nodes.forEach(node => {
    const c = node.category;
    const parentId = c.parentCategoryId();
    if (!parentId) {
      return;
    }
    const parent = nodeLookup.get(parentId);
    if (!parent) {
      throw new Error(`Cannot find parent ${parentId} for category ${c.id()}`);
    }
    node.parent = parent;
    parent.children.push(node);
  });
  return {
    tree,
    nodeLookup,
  };
}

function findNode(c: Category | number, tree: CategoryTree): CategoryTreeNode {
  const cid = c instanceof Category ? c.id() : c;
  const node = tree.nodeLookup.get(cid);
  assertDefined(node, `Cannot find category ${cid} in the tree`);
  return node;
}

function getAncestors(
  c: Category | number,
  tree: CategoryTree
): CategoryTreeNode[] {
  const node = findNode(c, tree);
  const ancestors = [];
  let parent = node.parent;
  while (parent) {
    ancestors.push(parent);
    parent = parent.parent;
  }
  return ancestors.reverse();
}

export function getNameWithAncestors(
  c: Category | number,
  tree: CategoryTree
): string {
  const node = findNode(c, tree);
  const ancestors = getAncestors(c, tree);
  return [...ancestors, node].map(a => a.category.name()).join(' > ');
}

export function findRoot(c: Category | number, tree: CategoryTree): Category {
  const node = findNode(c, tree);
  if (!node.parent) {
    return node.category;
  }
  const ancestors = getAncestors(c, tree);
  return ancestors[0].category;
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
    parent._immediateChildren.push(c);
    while (parent) {
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
      inOrderTreeTraversal(c._immediateChildren);
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

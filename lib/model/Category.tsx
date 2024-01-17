import {Category as DBCategory} from '@prisma/client';
import {assertDefined} from 'lib/assert';

export type Category = {
  id: number;
  name: string;
  displayOrder: number;
  parentCategoryId: number | null;
};

export type CategoryTree = {
  tree: CategoryTreeNode[];
  nodeLookup: Map<number, CategoryTreeNode>;
};

export type CategoryTreeNode = {
  category: Category;
  parent: CategoryTreeNode | null;
  children: CategoryTreeNode[];
};

export function isRoot(c: Category): boolean {
  return !c.parentCategoryId;
}

export function makeCategoryTree(all: Category[]): CategoryTree {
  const nodes: CategoryTreeNode[] = all.map(category => ({
    category,
    parent: null,
    children: [],
  }));
  const tree: CategoryTreeNode[] = nodes.filter(n => isRoot(n.category));
  const nodeLookup = new Map<number, CategoryTreeNode>(
    nodes.map(n => [n.category.id, n])
  );
  nodes.forEach(node => {
    const c = node.category;
    const parentId = c.parentCategoryId;
    if (!parentId) {
      return;
    }
    const parent = nodeLookup.get(parentId);
    if (!parent) {
      throw new Error(`Cannot find parent ${parentId} for category ${c.id}`);
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
  const cid = (c as Category).id ?? c;
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
  return [...ancestors, node].map(a => a.category.name).join(' > ');
}

export function findRoot(c: Category | number, tree: CategoryTree): Category {
  const node = findNode(c, tree);
  if (!node.parent) {
    return node.category;
  }
  const ancestors = getAncestors(c, tree);
  return ancestors[0].category;
}

export function categoryModelFromDB(init: DBCategory): Category {
  return {
    id: init.id,
    name: init.name,
    displayOrder: init.displayOrder,
    parentCategoryId: init.parentCategoryId,
  };
}

// Sort categories to get the list like:
//  - A
//  - A > Sub A
//  - B
//  - B > Sub B
export function sortCategories(categories: Category[]): Category[] {
  const tree = makeCategoryTree(categories);
  const sorted: Category[] = [];
  const inOrderTreeTraversal = (subtree: CategoryTreeNode[]) => {
    subtree.forEach(c => {
      sorted.push(c.category);
      const children = [...c.children].sort(
        (a, b) => a.category.displayOrder - b.category.displayOrder
      );
      inOrderTreeTraversal(children);
    });
  };
  inOrderTreeTraversal(tree.tree);
  return sorted;
}

export function subtreeIncludes(
  subtreeRoot: Category,
  maybeDescendant: Category,
  all: Category[]
): boolean {
  if (subtreeRoot.id == maybeDescendant.id) {
    return true;
  }
  return descendants(subtreeRoot, all).some(c => c.id == maybeDescendant.id);
}

export function ancestors(c: Category, all: Category[]): Category[] {
  const ancestors: Category[] = [];
  let parentId = c.parentCategoryId;
  while (parentId) {
    const parent = mustFindCategory(parentId, all);
    ancestors.push(parent);
    parentId = parent.parentCategoryId;
  }
  return ancestors;
}

export function immediateChildren(
  target: Category,
  all: Category[]
): Category[] {
  return all.filter(x => x.parentCategoryId == target.id);
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
  const c = categories.find(c => c.id == cid);
  if (!c) {
    throw new Error(`Category ${cid} is not found`);
  }
  return c;
}

import {assertDefined} from '@/lib/assert';
import {byDisplayOrderThenId} from '@/lib/util/util';
import {Category as DBCategory} from '@prisma/client';

export const TEST_ONLY = {
  getAncestors,
};

export type Category = {
  id: number;
  name: string;
  displayOrder: number;
  parentCategoryId: number | null;
};

export function categoryModelFromDB(init: DBCategory): Category {
  return {
    id: init.id,
    name: init.name,
    displayOrder: init.displayOrder,
    parentCategoryId: init.parentCategoryId,
  };
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

export type CategoryTree = {
  tree: CategoryTreeNode[];
  nodeLookup: Map<number, CategoryTreeNode>;
};

export type CategoryTreeNode = {
  category: Category;
  parent: CategoryTreeNode | null;
  children: CategoryTreeNode[];
};

type CategoryOrID = Category | number;

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

function findNode(c: CategoryOrID, tree: CategoryTree): CategoryTreeNode {
  const cid = (c as Category).id ?? c;
  const node = tree.nodeLookup.get(cid);
  assertDefined(node, `Cannot find category ${cid} in the tree`);
  return node;
}

export function findRoot(c: CategoryOrID, tree: CategoryTree): Category {
  const node = findNode(c, tree);
  if (!node.parent) {
    return node.category;
  }
  const ancestors = getAncestors(c, tree);
  return ancestors[0].category;
}

export function getAncestors(
  c: CategoryOrID,
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

export function getDescendants(
  target: CategoryOrID,
  tree: CategoryTree
): CategoryTreeNode[] {
  const targetNode = findNode(target, tree);
  const descendants = targetNode.children;
  const frontier = [...descendants];
  let next = frontier.pop();
  while (next) {
    const nextChildren = next.children;
    descendants.push(...nextChildren);
    frontier.push(...nextChildren);
    next = frontier.pop();
  }
  return descendants;
}

export function getNameWithAncestors(
  c: CategoryOrID,
  tree: CategoryTree
): string {
  const node = findNode(c, tree);
  const ancestors = getAncestors(c, tree);
  return [...ancestors, node].map(a => a.category.name).join(' > ');
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
    [...subtree]
      .sort((a, b) => byDisplayOrderThenId(a.category, b.category))
      .forEach(c => {
        sorted.push(c.category);
        inOrderTreeTraversal(c.children);
      });
  };
  inOrderTreeTraversal(tree.tree);
  return sorted;
}

export function subtreeIncludes(
  subtreeRoot: CategoryOrID,
  maybeDescendant: CategoryOrID,
  tree: CategoryTree
): boolean {
  const root = findNode(subtreeRoot, tree);
  let node: CategoryTreeNode | null = findNode(maybeDescendant, tree);
  while (node) {
    if (node.category.id === root.category.id) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

export function immediateChildren(
  parent: CategoryOrID,
  tree: CategoryTree
): Category[] {
  const node = findNode(parent, tree);
  return node.children.map(c => c.category);
}

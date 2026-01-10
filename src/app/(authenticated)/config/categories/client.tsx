'use client';
import {CategoryForm} from '@/app/(authenticated)/config/categories/CategoryForm';
import {Button} from '@/components/ui/button';
import {
  Category,
  categoryModelFromDB,
  immediateChildren,
  isRoot,
  makeCategoryTree,
  sortCategories,
} from '@/lib/model/Category';
import {updateState} from '@/lib/stateHelpers';
import {ChevronDownIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import {Category as DBCategory} from '@prisma/client';
import {useState} from 'react';

const CategoriesList = (props: {
  collapsed: number[];
  toggleCollapsedState: (categoryId: number) => void;
  categories: Category[];
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <>
      {props.categories.map(category => (
        <EditableCategoryListItem
          key={category.id}
          collapsed={props.collapsed}
          toggleCollapsedState={props.toggleCollapsedState}
          category={category}
          allCategories={props.allCategories}
          onCategoryUpdated={props.onCategoryUpdated}
        />
      ))}
    </>
  );
};

const EditableCategoryListItem = ({
  collapsed,
  toggleCollapsedState,
  category,
  allCategories,
  onCategoryUpdated,
}: {
  collapsed: number[];
  toggleCollapsedState: (categoryId: number) => void;
  category: Category;
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const showChildren = !collapsed.includes(category.id);
  const tree = makeCategoryTree(allCategories);
  const children = immediateChildren(category, tree);
  const hasChildren = children.length > 0;
  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? showChildren : undefined}
      aria-label={category.name}
      className="list-none"
    >
      <div className="my-2 rounded-md border p-3 shadow">
        <div className="flex items-center justify-between">
          <div
            className="grow cursor-pointer"
            onClick={() => toggleCollapsedState(category.id)}
          >
            {hasChildren && showChildren && (
              <ChevronDownIcon className="inline h-5 w-5" />
            )}
            {hasChildren && !showChildren && (
              <ChevronRightIcon className="inline h-5 w-5" />
            )}
            {/* Spacer for alignment if no children */}
            {!hasChildren && <span className="inline-block w-5" />}
            <span className="ml-2 align-middle text-base font-medium">
              {showEditForm && 'Editing '}
              {category.name}
            </span>
          </div>
          {!showEditForm && (
            <Button
              variant="link"
              size="inherit"
              onClick={() => setShowEditForm(true)}
            >
              Edit
            </Button>
          )}
        </div>
        {showEditForm && (
          <CategoryForm
            category={category}
            categories={allCategories}
            onAddedOrUpdated={x => {
              onCategoryUpdated(x);
              setShowEditForm(false);
            }}
            onClose={() => setShowEditForm(false)}
          />
        )}
      </div>
      {hasChildren && showChildren && (
        <ul role="group" className="ml-4 border-l pl-8">
          <CategoriesList
            collapsed={collapsed}
            toggleCollapsedState={toggleCollapsedState}
            categories={children}
            allCategories={allCategories}
            onCategoryUpdated={onCategoryUpdated}
          />
        </ul>
      )}
    </li>
  );
};

export function Actions({
  categories,
  onNewCategory,
  onExpandToggle,
}: {
  categories: Category[];
  onNewCategory: (added: DBCategory) => void;
  onExpandToggle: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  return (
    <div className="my-6">
      {!showAddForm && (
        <div className="space-x-2">
          <Button onClick={() => setShowAddForm(true)}>Add new category</Button>
          <Button onClick={() => onExpandToggle()}>Collapse/expand all</Button>
        </div>
      )}
      {showAddForm && (
        <>
          <div className="my-4 text-xl font-medium leading-5">
            Add New Category
          </div>
          <div className="ml-4">
            <CategoryForm
              categories={categories}
              onAddedOrUpdated={x => {
                setShowAddForm(false);
                onNewCategory(x);
              }}
              onClose={() => setShowAddForm(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function CategoriesConfigPage({
  dbCategories: initialDbCategories,
}: {
  dbCategories: DBCategory[];
}) {
  const [dbCategories, setDbCategories] = useState(initialDbCategories);
  const [collapsed, setCollapsed] = useState<Array<number>>([]);
  const categories = sortCategories(dbCategories.map(categoryModelFromDB));
  const rootCategories = categories.filter(c => isRoot(c));
  const addOrUpdateState = updateState(setDbCategories);
  const toggleCollapsedStateAll = () => {
    if (collapsed.length > 0) {
      // Something is collapsed - expand everything (i.e. nothing is collapsed).
      setCollapsed([]);
    } else {
      setCollapsed(categories.map(c => c.id));
    }
  };
  const toggleCollapsedState = (categoryId: number) => {
    if (collapsed.some(cid => cid == categoryId)) {
      setCollapsed(collapsed.filter(cid => cid != categoryId));
    } else {
      setCollapsed([categoryId, ...collapsed]);
    }
  };
  return (
    <>
      <Actions
        categories={categories}
        onNewCategory={addOrUpdateState}
        onExpandToggle={toggleCollapsedStateAll}
      />
      <ul role="tree">
        <CategoriesList
          collapsed={collapsed}
          toggleCollapsedState={toggleCollapsedState}
          categories={rootCategories}
          allCategories={categories}
          onCategoryUpdated={updateState(setDbCategories)}
        />
      </ul>
      <Actions
        categories={categories}
        onNewCategory={addOrUpdateState}
        onExpandToggle={toggleCollapsedStateAll}
      />
    </>
  );
}

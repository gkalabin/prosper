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
import {cn} from '@/lib/utils';
import {ChevronDownIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import {Category as DBCategory} from '@prisma/client';
import {useState} from 'react';

const CategoriesList = (props: {
  collapsed: number[];
  toggleCollapsedState: (categoryId: number) => void;
  categories: Category[];
  depth: number;
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <div role={props.depth === 0 ? 'tree' : 'treeitem'}>
      {props.categories.map(category => (
        <EditableCategoryListItem
          key={category.id}
          collapsed={props.collapsed}
          toggleCollapsedState={props.toggleCollapsedState}
          category={category}
          depth={props.depth}
          allCategories={props.allCategories}
          onCategoryUpdated={props.onCategoryUpdated}
        />
      ))}
    </div>
  );
};

const EditableCategoryListItem = ({
  collapsed,
  toggleCollapsedState,
  category,
  depth,
  allCategories,
  onCategoryUpdated,
}: {
  collapsed: number[];
  toggleCollapsedState: (categoryId: number) => void;
  category: Category;
  depth: number;
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const showChildren = !collapsed.includes(category.id);
  const tree = makeCategoryTree(allCategories);
  const children = immediateChildren(category, tree);
  const hasChildren = children.length > 0;
  return (
    <div
      aria-expanded={hasChildren ? showChildren : undefined}
      aria-label={category.name}
    >
      <div
        className={cn(
          'my-2 rounded-md border p-3 shadow',
          // https://stackoverflow.com/questions/69687530/dynamically-build-classnames-in-tailwindcss:
          // make following class names available for JIT: ml-4 ml-8 ml-12 ml-16 ml-20 ml-24 ml-28 ml-32 ml-36 ml-40
          'ml-' + depth * 4
        )}
      >
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
            <span
              className={cn(
                depth == 0 && 'text-xl font-medium',
                depth == 1 && 'text-lg',
                depth > 1 && 'text-base font-light',
                'ml-2 align-middle'
              )}
            >
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
        <CategoriesList
          collapsed={collapsed}
          toggleCollapsedState={toggleCollapsedState}
          categories={children}
          depth={depth + 1}
          allCategories={allCategories}
          onCategoryUpdated={onCategoryUpdated}
        />
      )}
    </div>
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
      <CategoriesList
        collapsed={collapsed}
        toggleCollapsedState={toggleCollapsedState}
        categories={rootCategories}
        depth={0}
        allCategories={categories}
        onCategoryUpdated={updateState(setDbCategories)}
      />
      <Actions
        categories={categories}
        onNewCategory={addOrUpdateState}
        onExpandToggle={toggleCollapsedStateAll}
      />
    </>
  );
}

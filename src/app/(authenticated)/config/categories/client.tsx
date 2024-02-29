'use client';
import {ChevronDownIcon, ChevronRightIcon} from '@heroicons/react/24/outline';
import {Category as DBCategory} from '@prisma/client';
import classNames from 'classnames';
import {AddOrEditCategoryForm} from '@/components/config/AddOrEditCategoryForm';
import {ButtonLink, ButtonPagePrimary} from '@/components/ui/buttons';
import {
  Category,
  categoryModelFromDB,
  immediateChildren,
  isRoot,
  makeCategoryTree,
  sortCategories,
} from '@/lib/model/Category';
import {updateState} from '@/lib/stateHelpers';
import {useState} from 'react';

const CategoriesList = (props: {
  categories: Category[];
  depth: number;
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <div>
      {props.categories.map(category => (
        <div key={category.id}>
          <EditableCategoryListItem
            category={category}
            depth={props.depth}
            allCategories={props.allCategories}
            onCategoryUpdated={props.onCategoryUpdated}
          />
        </div>
      ))}
    </div>
  );
};

const EditableCategoryListItem = ({
  category,
  depth,
  allCategories,
  onCategoryUpdated,
}: {
  category: Category;
  depth: number;
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showChildren, setShowChildren] = useState(true);
  const tree = makeCategoryTree(allCategories);
  const children = immediateChildren(category, tree);
  const hasChildren = children.length > 0;
  return (
    <>
      <div
        className={classNames(
          'my-2 rounded-md border p-3 shadow',
          // https://stackoverflow.com/questions/69687530/dynamically-build-classnames-in-tailwindcss:
          // make following classNames available for JIT: ml-4 ml-8 ml-12 ml-16 ml-20 ml-24 ml-28 ml-32 ml-36 ml-40
          'ml-' + depth * 4
        )}
      >
        <div className="flex items-center justify-between">
          <div
            className="grow cursor-pointer"
            onClick={() => setShowChildren(!showChildren)}
          >
            {hasChildren && showChildren && (
              <ChevronDownIcon className="inline h-5 w-5" />
            )}
            {hasChildren && !showChildren && (
              <ChevronRightIcon className="inline h-5 w-5" />
            )}
            <span
              className={classNames(
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
            <ButtonLink onClick={() => setShowEditForm(true)}>Edit</ButtonLink>
          )}
        </div>
        {showEditForm && (
          <AddOrEditCategoryForm
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
          categories={children}
          depth={depth + 1}
          allCategories={allCategories}
          onCategoryUpdated={onCategoryUpdated}
        />
      )}
    </>
  );
};

export function CategoriesConfigPage({
  dbCategories: initialDbCategories,
}: {
  dbCategories: DBCategory[];
}) {
  const [dbCategories, setDbCategories] = useState(initialDbCategories);
  const [showAddForm, setShowAddForm] = useState(false);
  const categories = sortCategories(dbCategories.map(categoryModelFromDB));
  const rootCategories = categories.filter(c => isRoot(c));

  const addOrUpdateState = updateState(setDbCategories);
  return (
    <>
      <CategoriesList
        categories={rootCategories}
        depth={0}
        allCategories={categories}
        onCategoryUpdated={updateState(setDbCategories)}
      />
      <div className="my-6">
        {!showAddForm && (
          <ButtonPagePrimary onClick={() => setShowAddForm(true)}>
            Add new category
          </ButtonPagePrimary>
        )}
        {showAddForm && (
          <>
            <div className="my-4 text-xl font-medium leading-5">
              Add New Category
            </div>
            <div className="ml-4">
              <AddOrEditCategoryForm
                categories={categories}
                onAddedOrUpdated={x => {
                  setShowAddForm(false);
                  addOrUpdateState(x);
                }}
                onClose={() => setShowAddForm(false)}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

'use client';
import {undoTailwindInputStyles} from 'components/forms/Select';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {
  Category,
  CategoryTree,
  getNameWithAncestors,
  makeCategoryTree,
  mustFindCategory,
} from 'lib/model/Category';
import Select from 'react-select';

export function ExcludedCategoriesSelector({
  excludedIds,
  setExcludedIds,
}: {
  excludedIds: number[];
  setExcludedIds: (newValue: number[]) => void;
}) {
  const {categories} = useAllDatabaseDataContext();
  return (
    <ExcludedCategoriesSelectorStandalone
      excludedIds={excludedIds}
      setExcludedIds={setExcludedIds}
      allCategories={categories}
    />
  );
}

export function ExcludedCategoriesSelectorStandalone({
  excludedIds,
  setExcludedIds,
  allCategories: all,
}: {
  excludedIds: number[];
  setExcludedIds: (newValue: number[]) => void;
  allCategories: Category[];
}) {
  const value: Category[] = excludedIds.map(id => mustFindCategory(id, all));
  const setValue = (v: readonly Category[]) => setExcludedIds(collectIds(v));
  const tree = makeCategoryTree(all);
  const formatter = makeCategoryNameFormatter(tree);
  return (
    <div>
      <label
        htmlFor="categoryIds"
        className="block text-sm font-medium text-gray-700"
      >
        Categories to exclude
      </label>
      <Select
        instanceId="excludeCategoryIdsInStats"
        styles={undoTailwindInputStyles()}
        options={[...all]}
        getOptionLabel={formatter}
        getOptionValue={formatter}
        isMulti
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

type CategoryNameFormatter = (c: Category) => string;

function makeCategoryNameFormatter(tree: CategoryTree): CategoryNameFormatter {
  return (c: Category): string => getNameWithAncestors(c, tree);
}

function collectIds(categories: readonly Category[]): number[] {
  return categories.map(c => c.id);
}

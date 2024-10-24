'use client';
import {MultiSelect} from '@/components/MultiSelect';
import {Label} from '@/components/ui/label';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';

export function ExcludedCategoriesSelector({
  excludedIds,
  setExcludedIds,
}: {
  excludedIds: number[];
  setExcludedIds: (newValue: number[]) => void;
}) {
  const {categories} = useAllDatabaseDataContext();
  const tree = makeCategoryTree(categories);
  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: getNameWithAncestors(c, tree),
  }));
  return (
    <div>
      <Label>Categories to exclude</Label>
      <MultiSelect
        options={categoryOptions}
        value={excludedIds}
        onChange={setExcludedIds}
      />
    </div>
  );
}

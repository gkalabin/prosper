'use client';
import {MultiSelect} from '@/components/MultiSelect';
import {Label} from '@/components/ui/label';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {getNameWithAncestors, makeCategoryTree} from '@/lib/model/Category';

export function ExcludedCategoriesSelector({
  excludedIds,
  setExcludedIds,
}: {
  excludedIds: number[];
  setExcludedIds: (newValue: number[]) => void;
}) {
  const {categories} = useCoreDataContext();
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

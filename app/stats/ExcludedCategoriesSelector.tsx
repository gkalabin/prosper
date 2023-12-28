"use client";
import { undoTailwindInputStyles } from "components/forms/Select";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import Select from "react-select";

export function ExcludedCategoriesSelector({
  excludedIds,
  setExcludedIds,
}: {
  excludedIds: number[];
  setExcludedIds: (newValue: number[]) => void;
}) {
  const { categories } = useAllDatabaseDataContext();
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  return (
    <div>
      <label
        htmlFor="categoryIds"
        className="block text-sm font-medium text-gray-700"
      >
        Categories to exclude
      </label>
      <Select
        instanceId="excludeCategories"
        styles={undoTailwindInputStyles()}
        options={categoryOptions}
        isMulti
        value={excludedIds.map((x) => ({
          label: categoryOptions.find((c) => c.value == x)?.label ?? "Unknown",
          value: x,
        }))}
        onChange={(x) => setExcludedIds(x.map((x) => x.value))}
      />
    </div>
  );
}

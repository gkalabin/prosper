import React, { useState } from "react";
import Category from "../../../lib/model/Category";

type EditableCategoryListItemProps = {
  category: Category;
  categories: Category[];
  onUpdated: (updated: Category) => void;
  depth: number;
};

const EditableCategoryListItem: React.FC<EditableCategoryListItemProps> = (
  props
) => {
  const [name, setName] = useState(props.category.name);
  const [displayOrder, setDisplayOrder] = useState(props.category.displayOrder);
  const [parentId, setParentId] = useState(props.category.parentCategoryId);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestInFlight, setRequestInFlight] = useState(false);

  const reset = () => {
    setName(props.category.name);
    setDisplayOrder(props.category.displayOrder);
    setParentId(props.category.parentCategoryId);
    setApiError("");
  };

  const open = () => {
    reset();
    setFormDisplayed(true);
  };

  const close = () => {
    reset();
    setFormDisplayed(false);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setApiError("");
    setRequestInFlight(true);
    const parentCategoryId = parentId ? +parentId : null;
    try {
      const body = {
        name,
        parentCategoryId,
        displayOrder,
      };
      const response = await fetch(`/api/config/category/${props.category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onUpdated(await response.json());
    } catch (error) {
      setApiError(`Failed to update: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    let categoryNameClass = "text-base font-light";
    if (props.depth == 0) {
      categoryNameClass = "text-xl font-medium";
    } else if (props.depth == 1) {
      categoryNameClass = "text-lg";
    }
    return (
      <>
        <span className={categoryNameClass}>{props.category.name}</span>;
        <small className="text-sm py-4">
          displayOrder {props.category.displayOrder}
        </small>
        <button onClick={open}>Edit</button>
      </>
    );
  }
  return (
    <form onSubmit={handleSubmit}>
      <input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        disabled={requestInFlight}
        value={name}
      />
      <input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        disabled={requestInFlight}
        value={displayOrder}
      />
      <select
        onChange={(e) => setParentId(+e.target.value)}
        value={props.category.parentCategoryId}
        disabled={requestInFlight}
      >
        <option value="">No parent</option>
        {props.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.nameWithAncestors}
          </option>
        ))}
      </select>
      <button onClick={close} disabled={requestInFlight}>
        Cancel
      </button>
      <input
        disabled={!name || requestInFlight}
        type="submit"
        value={requestInFlight ? "Updating…" : "Update"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};

export default EditableCategoryListItem;

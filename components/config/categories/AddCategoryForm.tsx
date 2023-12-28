import { Category as DBCategory } from "@prisma/client";
import React, { useState } from "react";
import { Category } from "lib/model/Category";

type AddCategoryFormProps = {
  onAdded: (created: DBCategory) => void;
  allCategories: Category[];
};

const AddCategoryForm: React.FC<AddCategoryFormProps> = (props) => {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(0);
  const [formDisplayed, setFormDisplayed] = useState(false);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setName("");
    setParentId(0);
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
        displayOrder: props.allCategories.length * 100,
      };
      const newCategory = await fetch("/api/config/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onAdded(await newCategory.json());
    } catch (error) {
      setApiError(`Failed to create new category: ${error}`);
    }
    setRequestInFlight(false);
  };

  if (!formDisplayed) {
    return <button onClick={open}>New category</button>;
  }
  return (
    <form onSubmit={handleSubmit}>
      <h3>New Category</h3>
      <input
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        disabled={requestInFlight}
        type="text"
        value={name}
      />
      <select
        onChange={(e) => setParentId(+e.target.value)}
        disabled={requestInFlight}
      >
        <option value="">No parent</option>
        {props.allCategories.map((category) => (
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
        value={requestInFlight ? "Adding…" : "Add"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};

export default AddCategoryForm;

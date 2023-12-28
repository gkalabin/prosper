import React, { useState } from "react";
import CategoryProps from "./CategoryProps";

type CreateCategoryFormProps = {
  onCreated: Function;
  allCategories: CategoryProps[];
};

const CreateCategoryForm: React.FC<CreateCategoryFormProps> = (props) => {
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
      const newCategory = await fetch("/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onCreated(await newCategory.json());
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
        value={requestInFlight ? "Creating…" : "Create"}
      />
      {apiError && <span>{apiError}</span>}
    </form>
  );
};

export default CreateCategoryForm;

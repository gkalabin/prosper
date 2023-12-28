import React, { useState } from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";

export const getStaticProps: GetStaticProps = async () => {
  const categories = await prisma.category.findMany({});
  console.debug("Categories from DB", categories);

  return {
    props: { dbCategories: JSON.parse(JSON.stringify(categories)) },
  };
};

type CategoryDbModel = {
  id: string;
  name: string;
  parentCategoryId?: number;
  displayOrder: number;
};
type CategoryProps = {
  id: string;
  name: string;
  nameWithAncestors: string;
  isRoot: boolean;
  displayOrder: number;
  parentCategoryId?: number;
  children: CategoryProps[];
};
type CategoriesListProps = {
  categories: CategoryProps[];
  allCategories: CategoryProps[];
  onCategoryUpdated: Function;
  depth: number;
};
type EditableCategoryListItemProps = {
  category: CategoryProps;
  categories: CategoryProps[];
  onCategoryUpdated: Function;
  depth: number;
};
type CreateCategoryFormProps = {
  onNewCategoryCreated: Function;
  allCategories: CategoryProps[];
};
type PageProps = {
  dbCategories: CategoryDbModel[];
};

const CreateCategoryFormComponent: React.FC<CreateCategoryFormProps> = (
  props
) => {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInProgress, setCreateInProgress] = useState(false);
  const [apiError, setApiError] = useState("");

  const reset = () => {
    setName("");
    setApiError("");
    setParentId(0);
  };

  const open = () => {
    reset();
    setShowCreateForm(true);
  };

  const close = () => {
    reset();
    setShowCreateForm(false);
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setApiError("");
    setCreateInProgress(true);
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
      props.onNewCategoryCreated(await newCategory.json());
    } catch (error) {
      setApiError(`Failed to create new category: ${error}`);
    }
    setCreateInProgress(false);
  };

  if (showCreateForm) {
    return (
      <form onSubmit={submitData}>
        <h3>New Category</h3>
        <input
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          disabled={createInProgress}
          type="text"
          value={name}
        />
        <select
          onChange={(e) => setParentId(+e.target.value)}
          disabled={createInProgress}
        >
          <option value="">No parent</option>
          {props.allCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameWithAncestors}
            </option>
          ))}
        </select>
        <button onClick={close} disabled={createInProgress}>
          Cancel
        </button>
        <input
          disabled={!name || createInProgress}
          type="submit"
          value={createInProgress ? "Creating…" : "Create"}
        />
        {apiError && <span>{apiError}</span>}
      </form>
    );
  }
  return <button onClick={open}>New category</button>;
};

const EditableCategoryListItem: React.FC<EditableCategoryListItemProps> = (
  props
) => {
  const [name, setName] = useState(props.category.name);
  const [displayOrder, setDisplayOrder] = useState(props.category.displayOrder);
  const [parentId, setParentId] = useState(props.category.parentCategoryId);
  const [showForm, setShowForm] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateInProgress, setUpdateInProgress] = useState(false);

  const reset = () => {
    setName(props.category.name);
    setDisplayOrder(props.category.displayOrder);
    setParentId(props.category.parentCategoryId);
    setUpdateError("");
  };

  const open = () => {
    reset();
    setShowForm(true);
  };

  const close = () => {
    reset();
    setShowForm(false);
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setUpdateError("");
    setUpdateInProgress(true);
    const parentCategoryId = parentId ? +parentId : null;
    try {
      const body = {
        name,
        parentCategoryId,
        displayOrder,
      };
      const response = await fetch(`/api/category/${props.category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      close();
      props.onCategoryUpdated(await response.json());
    } catch (error) {
      setUpdateError(`Failed to update: ${error}`);
    }
    setUpdateInProgress(false);
  };

  if (!showForm) {
    let categoryName = <span>{props.category.name}</span>;
    if (props.depth == 0) {
      categoryName = <strong>{props.category.name}</strong>;
    }
    return (
      <>
        {categoryName}
        <small>displayOrder {props.category.displayOrder}</small>
        <button onClick={open}>Edit</button>
      </>
    );
  }
  return (
    <form onSubmit={submitData}>
      <input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        disabled={updateInProgress}
        value={name}
      />
      <input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        disabled={updateInProgress}
        value={displayOrder}
      />
      <select
        onChange={(e) => setParentId(+e.target.value)}
        value={props.category.parentCategoryId}
        disabled={updateInProgress}
      >
        <option value="">No parent</option>
        {props.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.nameWithAncestors}
          </option>
        ))}
      </select>
      <button onClick={close} disabled={updateInProgress}>
        Cancel
      </button>
      <input
        disabled={!name || updateInProgress}
        type="submit"
        value={updateInProgress ? "Updating…" : "Update"}
      />
      {updateError && <span>{updateError}</span>}
    </form>
  );
};

const CategoriesList: React.FC<CategoriesListProps> = (props) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <ul>
      {props.categories.map((category) => (
        <li key={category.id}>
          <EditableCategoryListItem
            category={category}
            categories={props.allCategories}
            onCategoryUpdated={props.onCategoryUpdated}
            depth={props.depth}
          />
          {category.children && (
            <CategoriesList
              categories={category.children}
              allCategories={props.allCategories}
              onCategoryUpdated={props.onCategoryUpdated}
              depth={props.depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

const CategoriesPage: React.FC<PageProps> = (props) => {
  const [dbCategories, setDbCategories] = useState(props.dbCategories);
  const uiCategories = dbCategories.map((c) =>
    Object.assign({}, c, {
      nameWithAncestors: c.name,
      isRoot: !c.parentCategoryId,
      children: [] as CategoryProps[],
    })
  );
  const categoryById = Object.fromEntries(uiCategories.map((c) => [c.id, c]));
  uiCategories.forEach((c) => {
    if (!c.parentCategoryId) {
      return;
    }
    let parent = categoryById[c.parentCategoryId];
    parent.children.push(c);
    let ancestorNames = [c.name];
    while (parent) {
      ancestorNames.push(parent.name);
      if (!parent.parentCategoryId) {
        break;
      }
      parent = categoryById[parent.parentCategoryId];
    }
    c.nameWithAncestors = ancestorNames.reverse().join(" > ");
  });
  uiCategories.sort((c1, c2) => c1.displayOrder - c2.displayOrder);
  uiCategories.forEach((c) =>
    c.children.sort((c1, c2) => c1.displayOrder - c2.displayOrder)
  );
  let allCategoriesFlat = [] as CategoryProps[];
  const collectCategories = (
    subtree: CategoryProps[],
    output: CategoryProps[]
  ) => {
    if (subtree.length == 0) {
      return;
    }
    subtree.forEach((c) => {
      output.push(c);
      collectCategories(c.children, output);
    });
  };
  const rootCategories = uiCategories.filter((c) => c.isRoot);
  collectCategories(rootCategories, allCategoriesFlat);

  const addNewCategory = (newCategory: CategoryDbModel) => {
    console.debug("addNewCategory", newCategory);
    setDbCategories((oldCategories) => [...oldCategories, newCategory]);
  };
  const updateCategory = (updated: CategoryDbModel) => {
    console.debug("updateCategory", updateCategory);
    const newCategories = dbCategories.map((c) =>
      c.id == updated.id ? updated : c
    );
    setDbCategories(newCategories);
  };

  return (
    <Layout>
      <CategoriesList
        categories={rootCategories}
        allCategories={allCategoriesFlat}
        onCategoryUpdated={updateCategory}
        depth={0}
      />
      <CreateCategoryFormComponent
        allCategories={allCategoriesFlat}
        onNewCategoryCreated={addNewCategory}
      />
    </Layout>
  );
};

export default CategoriesPage;

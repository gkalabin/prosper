import React, { useState } from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";

// TODO:
//  - error handling

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
  const [parentId, setParentId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInProgress, setCreateInProgress] = useState(false);

  const closeForm = () => {
    setName("");
    setShowCreateForm(false);
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
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
      closeForm();
      props.onNewCategoryCreated(await newCategory.json());
    } catch (error) {
      console.error(error);
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
          type="text"
          value={name}
        />
        <select onChange={(e) => setParentId(e.target.value)}>
          <option value="">No parent</option>
          {props.allCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameWithAncestors}
            </option>
          ))}
        </select>
        <button onClick={closeForm}>Cancel</button>
        <input
          disabled={!name || createInProgress}
          type="submit"
          value={createInProgress ? "Creating…" : "Create"}
        />
      </form>
    );
  }
  return <button onClick={(e) => setShowCreateForm(true)}>New category</button>;
};

const EditableCategoryListItem: React.FC<EditableCategoryListItemProps> = (
  props
) => {
  const [name, setName] = useState(props.category.name);
  const [displayOrder, setDisplayOrder] = useState(props.category.displayOrder);
  const [parentId, setParentId] = useState(props.category.parentCategoryId);
  const [showForm, setShowForm] = useState(false);
  const [updateInProgress, setUpdateInProgress] = useState(false);

  const closeForm = () => {
    setName(props.category.name);
    setDisplayOrder(props.category.displayOrder);
    setParentId(props.category.parentCategoryId);
    setShowForm(false);
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
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
      closeForm();
      props.onCategoryUpdated(await response.json());
    } catch (error) {
      console.error(error);
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
        <button onClick={(e) => setShowForm(true)}>Edit</button>
      </>
    );
  }
  return (
    <form onSubmit={submitData}>
      <input
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
        value={name}
      />
      <input
        onChange={(e) => setDisplayOrder(+e.target.value)}
        placeholder="Display order"
        type="number"
        value={displayOrder}
      />
      <select
        onChange={(e) => setParentId(+e.target.value)}
        value={props.category.parentCategoryId}
      >
        <option value="">No parent</option>
        {props.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.nameWithAncestors}
          </option>
        ))}
      </select>
      <button onClick={closeForm}>Cancel</button>
      <input
        disabled={!name || updateInProgress}
        type="submit"
        value={updateInProgress ? "Updating…" : "Update"}
      />
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
      children: [],
    })
  );
  const categoryById = Object.fromEntries(uiCategories.map((c) => [c.id, c]));
  uiCategories
    .filter((c) => c.parentCategoryId)
    .forEach((c) => {
      let parent = categoryById[c.parentCategoryId];
      parent.children.push(c);
      let ancestorNames = [c.name];
      while (parent) {
        ancestorNames.push(parent.name);
        parent = categoryById[parent.parentCategoryId];
      }
      c.nameWithAncestors = ancestorNames.reverse().join(" > ");
    });
  uiCategories.sort((c1, c2) => c1.displayOrder - c2.displayOrder);
  uiCategories.forEach((c) =>
    c.children.sort((c1, c2) => c1.displayOrder - c2.displayOrder)
  );
  let allCategoriesFlat = [];
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

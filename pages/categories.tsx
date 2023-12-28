import React, { useState } from "react";
import prisma from "../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";
import CreateCategoryForm from "../components/categories/CreateCategoryForm";
import CategoryProps from "../components/categories/CategoryProps";
import EditableCategoryListItem from "../components/categories/EditableCategoryListItem";

type CategoryDbModel = {
  id: string;
  name: string;
  parentCategoryId?: number;
  displayOrder: number;
};
export const getStaticProps: GetStaticProps = async () => {
  const categories = await prisma.category.findMany({});
  console.debug("Categories from DB", categories);

  return {
    props: { dbCategories: JSON.parse(JSON.stringify(categories)) },
  };
};

type CategoriesListProps = {
  categories: CategoryProps[];
  allCategories: CategoryProps[];
  onCategoryUpdated: Function;
  depth: number;
};
type PageProps = {
  dbCategories: CategoryDbModel[];
};

const CategoriesList: React.FC<CategoriesListProps> = (props) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <ul className="space-y-1 px-4 list-disc list-inside">
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

  const addNewCategory = (added: CategoryDbModel) => {
    console.debug("addNewCategory", added);
    setDbCategories((old) => [...old, added]);
  };
  const updateCategory = (updated: CategoryDbModel) => {
    console.debug("updateCategory", updated);
    setDbCategories((old) =>
      old.map((c) => (c.id == updated.id ? updated : c))
    );
  };

  return (
    <Layout>
      <CategoriesList
        categories={rootCategories}
        allCategories={allCategoriesFlat}
        onCategoryUpdated={updateCategory}
        depth={0}
      />
      <CreateCategoryForm
        allCategories={allCategoriesFlat}
        onNewCategoryCreated={addNewCategory}
      />
    </Layout>
  );
};

export default CategoriesPage;

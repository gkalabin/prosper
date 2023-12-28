import React, { useState } from "react";
import prisma from "../../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../../components/Layout";
import CreateCategoryForm from "../../components/config/categories/CreateCategoryForm";
import Category from "../../lib/model/Category";
import EditableCategoryListItem from "../../components/config/categories/EditableCategoryListItem";

type CategoryDbModel = {
  id: string;
  name: string;
  parentCategoryId?: number;
  displayOrder: number;
};
export const getStaticProps: GetStaticProps = async () => {
  const categories = await prisma.category.findMany({});
  return {
    props: { dbCategories: JSON.parse(JSON.stringify(categories)) },
  };
};

type CategoriesListProps = {
  categories: Category[];
  allCategories: Category[];
  onCategoryUpdated: Function;
  depth: number;
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
            onUpdated={props.onCategoryUpdated}
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

type PageProps = {
  dbCategories: CategoryDbModel[];
};
const CategoriesPage: React.FC<PageProps> = (props) => {
  const [dbCategories, setDbCategories] = useState(props.dbCategories);
  const uiCategories = dbCategories.map((c) =>
    Object.assign({}, c, {
      nameWithAncestors: c.name,
      isRoot: !c.parentCategoryId,
      children: [] as Category[],
    })
  );
  const categoryById = Object.fromEntries(uiCategories.map((c) => [c.id, c]));
  uiCategories.forEach((c) => {
    if (!c.parentCategoryId) {
      return;
    }
    let parent = categoryById[c.parentCategoryId];
    parent.children.push(c);
    const ancestorNames = [c.name];
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
  const allCategoriesFlat = [] as Category[];
  const collectCategories = (subtree: Category[], output: Category[]) => {
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
    setDbCategories((old) => [...old, added]);
  };
  const updateCategory = (updated: CategoryDbModel) => {
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
        onCreated={addNewCategory}
      />
    </Layout>
  );
};

export default CategoriesPage;

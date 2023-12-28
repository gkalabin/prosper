import { Category as DBCategory } from "@prisma/client";
import AddCategoryForm from "components/config/categories/AddCategoryForm";
import EditableCategoryListItem from "components/config/categories/CategoryListItem";
import Layout from "components/Layout";
import { Category, categoryModelFromDB } from "lib/model/Category";
import prisma from "lib/prisma";
import { GetStaticProps } from "next";
import React, { useState } from "react";

export const getStaticProps: GetStaticProps = async () => {
  const categories = await prisma.category.findMany({});
  return {
    props: { dbCategories: JSON.parse(JSON.stringify(categories)) },
  };
};

type CategoriesListProps = {
  categories: Category[];
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
};

const CategoriesList: React.FC<CategoriesListProps> = (props) => {
  if (!props.categories) {
    return <div>No categories found.</div>;
  }
  return (
    <ul className="list-inside list-disc space-y-1 px-4">
      {props.categories.map((category) => (
        <li key={category.id}>
          <EditableCategoryListItem
            category={category}
            categories={props.allCategories}
            onUpdated={props.onCategoryUpdated}
          />
          {category.children && (
            <CategoriesList
              categories={category.children}
              allCategories={props.allCategories}
              onCategoryUpdated={props.onCategoryUpdated}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

type PageProps = {
  dbCategories: DBCategory[];
};
const CategoriesPage: React.FC<PageProps> = (props) => {
  const [dbCategories, setDbCategories] = useState(props.dbCategories);
  const allCategoriesFlat = categoryModelFromDB(dbCategories);
  const rootCategories = allCategoriesFlat.filter((c) => c.isRoot);

  const addNewCategory = (added: DBCategory) => {
    setDbCategories((old) => [...old, added]);
  };
  const updateCategory = (updated: DBCategory) => {
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
      />
      <AddCategoryForm
        allCategories={allCategoriesFlat}
        onAdded={addNewCategory}
      />
    </Layout>
  );
};

export default CategoriesPage;

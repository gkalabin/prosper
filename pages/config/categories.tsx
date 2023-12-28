import React, { useState } from "react";
import prisma from "../../lib/prisma";
import { GetStaticProps } from "next";
import Layout from "../../components/Layout";
import AddCategoryForm from "../../components/config/categories/AddCategoryForm";
import Category, { makeCategoryTree } from "../../lib/model/Category";
import EditableCategoryListItem from "../../components/config/categories/CategoryListItem";

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
  onCategoryUpdated: (updated: Category) => void;
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
  dbCategories: CategoryDbModel[];
};
const CategoriesPage: React.FC<PageProps> = (props) => {
  const [dbCategories, setDbCategories] = useState(props.dbCategories);
  const allCategoriesFlat = makeCategoryTree(dbCategories);
  const rootCategories = allCategoriesFlat.filter((c) => c.isRoot);

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
      />
      <AddCategoryForm
        allCategories={allCategoriesFlat}
        onAdded={addNewCategory}
      />
    </Layout>
  );
};

export default CategoriesPage;

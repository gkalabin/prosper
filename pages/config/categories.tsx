import { Category as DBCategory } from "@prisma/client";
import AddCategoryForm from "components/config/categories/AddCategoryForm";
import EditableCategoryListItem from "components/config/categories/CategoryListItem";
import { ConfigPageLayout } from "components/ConfigPageLayout";
import { DB } from "lib/db";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { updateState } from "lib/stateHelpers";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { useState } from "react";

const CategoriesList = (props: {
  categories: Category[];
  allCategories: Category[];
  onCategoryUpdated: (updated: DBCategory) => void;
}) => {
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

export const getServerSideProps: GetServerSideProps<{
  data?: {
    dbCategories: DBCategory[];
  };
}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { props: {} };
  }
  const userId = +session.user.id;
  const db = new DB({ userId });
  const categories = await db.categoryFindMany();
  return {
    props: { data: { dbCategories: JSON.parse(JSON.stringify(categories)) } },
  };
};

const CategoriesPage = ({
  data: { dbCategories: initialDbCategories },
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const [dbCategories, setDbCategories] = useState(initialDbCategories);
  const allCategoriesFlat = categoryModelFromDB(dbCategories);
  const rootCategories = allCategoriesFlat.filter((c) => c.isRoot);

  return (
    <ConfigPageLayout>
      <CategoriesList
        categories={rootCategories}
        allCategories={allCategoriesFlat}
        onCategoryUpdated={updateState(setDbCategories)}
      />
      <AddCategoryForm
        allCategories={allCategoriesFlat}
        onAdded={updateState(setDbCategories)}
      />
    </ConfigPageLayout>
  );
};

export default CategoriesPage;

import { Bank as DBBank } from "@prisma/client";
import Layout from "components/Layout";
import { Input } from "components/forms/Input";
import { ButtonFormPrimary } from "components/ui/buttons";
import { DB } from "lib/db";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps<{
  dbBank: DBBank;
}> = async ({ query, req, res }) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  const bankId = parseInt(query.bankId as string, 10);
  const userId = +session.user.id;
  const db = new DB({ userId });
  const [dbBank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!dbBank) {
    return {
      notFound: true,
    };
  }
  return {
    props: JSON.parse(
      JSON.stringify({
        dbBank,
      })
    ),
  };
};

export default function Page({
  dbBank,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [token, setToken] = useState("");
  return (
    <Layout>
      <h1 className="text-2xl font-semibold">
        Connecting {dbBank.name} with Starling Bank
      </h1>
      <form
        action={`/api/open-banking/starling/connect?bankId=${dbBank.id}`}
        method="POST"
        className="mt-4 space-y-4"
      >
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700"
          >
            Personal token
          </label>
          <Input
            id="token"
            type="text"
            name="token"
            className="block w-full"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <ButtonFormPrimary type="submit" disabled={!token}>Connect</ButtonFormPrimary>
        </div>
      </form>
    </Layout>
  );
}

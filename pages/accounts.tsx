import React from "react"
import prisma from '../lib/prisma';
import { GetStaticProps } from "next"
import Layout from "../components/Layout"
import Bank, { BankProps } from "../components/Bank";

export const getStaticProps: GetStaticProps = async () => {
  const banks = await prisma.bank.findMany({
    orderBy: {
      displayOrder: 'asc'
    }
  });

  console.log(banks)

  return {
    props: { banks: JSON.parse(JSON.stringify(banks)) },
    revalidate: 10,
  };
};

type Props = {
  banks: BankProps[]
}

const AccountsPage: React.FC<Props> = (props) => {
  return (
    <Layout>
      <div className="page">
        <main>
          {props.banks.map((bank) => (
            <div key={bank.id} className="post">
              <Bank bank={bank} />
            </div>
          ))}
        </main>
      </div>
    </Layout>
  )
}

export default AccountsPage

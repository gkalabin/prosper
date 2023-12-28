import React from "react"
import prisma from '../lib/prisma';
import { GetStaticProps } from "next"
import Layout from "../components/Layout"
import Bank, { BankProps } from "../components/Bank";

export const getStaticProps: GetStaticProps = async () => {
  const currencies = await prisma.currency.findMany({});

  return {
    props: { currencies: JSON.parse(JSON.stringify(currencies)) },
    revalidate: 10,
  };
};

type Props = {
  currencies: BankProps[]
}

const AccountsPage: React.FC<Props> = (props) => {
  return (
    <Layout>
      <div>
      {props.currencies.map((bank) => (
            <div key={bank.id} className="post">
              <Bank bank={bank} />
            </div>
          ))}
      </div>
    </Layout>
  )
}

export default AccountsPage

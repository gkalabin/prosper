import {BankPage} from '@/app/(authenticated)/bank/[bankId]/[name]/bank-page';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Bank} from '@prisma/client';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

type Props = {params: Promise<{bankId: string}>};

async function fetchBank(props: Props): Promise<Bank | null> {
  const userId = await getUserIdOrRedirect();
  const bankId = positiveIntOrNull((await props.params).bankId);
  if (!bankId) {
    return null;
  }
  const db = new DB({userId});
  const [bank] = await db.bankFindMany({where: {id: bankId}});
  return bank ? bank : null;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const bank = await fetchBank({params});
  if (!bank) {
    return notFound();
  }
  return {
    title: bank.name + ' - Prosper',
  };
}

// 'name' parameter is unused intentionally, it is used only to make the URLs look
// nice, but the actual bank is identified by a separate id parameter.
export default async function Page({params}: Props) {
  const userId = await getUserIdOrRedirect();
  const bank = await fetchBank({params});
  if (!bank) {
    return notFound();
  }
  logRequest('bank', `userId:${userId} bankId:${bank.id}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <BankPage dbData={data} dbBank={bank} />;
}

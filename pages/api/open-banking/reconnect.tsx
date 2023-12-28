import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import { DB } from "lib/db";
import type { NextApiRequest, NextApiResponse } from "next";

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bankId = parseInt(req.query.bankId as string, 10);
  const db = new DB({ userId });
  {
    const [token] = await db.trueLayerTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      res.redirect(`/api/open-banking/truelayer/connect?bankId=${bankId}`);
      return;
    }
  }
  {
    const [token] = await db.nordigenTokenFindMany({
      where: {
        bankId,
      },
    });
    if (token) {
      const requisition = await db.nordigenRequisitionFindFirst({
        where: {
          bankId,
        },
      });
      res.redirect(
        `/api/open-banking/nordigen/connect?bankId=${bankId}&institutionId=${requisition?.institutionId}`
      );
      return;
    }
  }
  res.status(404).send(`Bank ${bankId} is not connected`);
}

export default authenticatedApiRoute("GET", handle);

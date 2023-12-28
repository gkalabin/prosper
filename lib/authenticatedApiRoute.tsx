import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";

export declare type AuthentiatedApiHandler = (
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<unknown>;

export function authenticatedApiRoute(
  method: "GET" | "POST" | "PUT",
  handler: AuthentiatedApiHandler
) {
  return async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method != method) {
      res
        .status(405)
        .send(`HTTP ${req.method} method is not supported at this route`);
      return;
    }
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).send("not authenticated");
      return;
    }

    return await handler(+session.user.id, req, res);
  };
}

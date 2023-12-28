import { withIronSessionApiRoute } from "iron-session/next/dist";
import { sessionOptions } from "lib/session";
import { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

export declare type AuthentiatedApiHandler = (
  user: User,
  req: NextApiRequest,
  res: NextApiResponse
) => unknown | Promise<unknown>;

export function authenticatedApiRoute(handler: AuthentiatedApiHandler) {
  return withIronSessionApiRoute(async function handle(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (!req.session.user?.isLoggedIn) {
      res.status(401).send("not authenticated");
      return;
    }
    return handler(req.session.user, req, res);
  },
  sessionOptions);
}

import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";

export declare type AuthentiatedApiHandler = (
  user: User,
  req: NextApiRequest,
  res: NextApiResponse
) => unknown | Promise<unknown>;

export function authenticatedApiRoute(method: "POST" | "PUT", handler: AuthentiatedApiHandler) {
  return withIronSessionApiRoute(async function handle(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method != method) {
      res
        .status(400)
        .send(`HTTP ${req.method} method is not supported at this route`);
      return;
    }
    if (!req.session.user?.isLoggedIn) {
      res.status(401).send("not authenticated");
      return;
    }
    return handler(req.session.user, req, res);
  },
  sessionOptions);
}

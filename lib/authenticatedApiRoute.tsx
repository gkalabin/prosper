import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { NextApiRequest, NextApiResponse } from "next";
import { User } from "pages/api/user";
import { unstable_getServerSession } from "next-auth/next"
import { authOptions } from "pages/api/auth/[...nextauth]"

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
    const session = await unstable_getServerSession(req, res, authOptions)
  if (session) {
    res.send({
      content:
        "This is protected content. You can access this content because you are signed in.",
    })
  } else {
    res.send({
      error: "You must be signed in to view the protected content on this page.",
    })
  }
  
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

import { withIronSessionApiRoute } from "iron-session/next";
import { NextApiRequest, NextApiResponse } from "next";
import { sessionOptions } from "../../lib/session";
import type { User } from "./user";

function logoutRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  req.session.destroy();
  res.redirect("/login");
}

export default withIronSessionApiRoute(logoutRoute, sessionOptions);

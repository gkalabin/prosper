import { withIronSessionApiRoute } from "iron-session/next";
import { NextApiRequest, NextApiResponse } from "next";
import { sessionOptions } from "lib/session";
import type { User } from "./user";

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  const { login, password } = await req.body;
  if (login != process.env.LOGIN || password != process.env.PASSWORD) {
    res.status(401).send("invalid login or password");
    return;
  }
  try {
    const user = { isLoggedIn: true, login: login } as User;
    req.session.user = user;
    await req.session.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);

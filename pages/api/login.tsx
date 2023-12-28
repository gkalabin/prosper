import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { NextApiRequest, NextApiResponse } from "next";
import type { User } from "pages/api/user";

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method != "POST") {
    res
      .status(400)
      .send(`HTTP ${req.method} method is not supported at this route`);
    return;
  }
  const { login, password } = await req.body;
  if (
    login != process.env.LOGIN ||
    password != process.env.PASSWORD
    // import { compareSync } from "bcrypt";
    // compareSync(process.env.PASSWORD, password)
  ) {
    res.status(401).send("invalid login or password");
    return;
  }
  try {
    const user = { isLoggedIn: true, login: login } as User;
    req.session.user = user;
    await req.session.save();
    res.json(user);
  } catch (error) {
    res.status(500).send(`failed to save session: ${error}`);
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);

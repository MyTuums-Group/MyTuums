import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "./auth";
import {
  accountStatusService,
  type AccountLifecycleSnapshot,
} from "./services/account-status/index.js";

export interface Context {
  req: FastifyRequest;
  reply: FastifyReply;
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  accountLifecycle: AccountLifecycleSnapshot | null;
}

export async function createContext(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<Context> {
  const headers = new Headers(
    Object.entries(req.headers).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const session = await auth.api.getSession({ headers });
  const accountLifecycle = session
    ? await accountStatusService.getLifecycleSnapshot(session.user.id)
    : null;

  return { req, reply, session, accountLifecycle };
}

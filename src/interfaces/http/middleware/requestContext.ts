import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext = new AsyncLocalStorage<{ requestId: string; startedAt: number }>();

export const requestContextMiddleware: RequestHandler = (_req, res, next) => {
    const context = { requestId: randomUUID(), startedAt: performance.now() };
    res.setHeader("X-Request-Id", context.requestId);
    requestContext.run(context, next);
};

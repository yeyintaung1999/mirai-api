import express from 'express';

import { userRoutes } from './interfaces/http/routes/userRoutes.js';
import { authRouter } from './interfaces/http/routes/authRoutes.js';

import { errorMiddleware } from './interfaces/http/middleware/errorMiddleware.js'
import { authMiddleware } from './interfaces/http/middleware/authMiddleware.js';
import { requestContextMiddleware } from './interfaces/http/middleware/requestContext.js';
import { NotFoundError } from './application/errors/NotFoundError.js';

export const app = express();
app.disable('x-powered-by');
app.use(requestContextMiddleware);

app.use(express.json());
app.use('/auth', authRouter);
app.use('/user', authMiddleware, userRoutes);

app.use((_req, _res, next) => next(new NotFoundError("Route not found")));
app.use(errorMiddleware);

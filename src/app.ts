import express from 'express';

import { authRoutes } from './interfaces/http/routes/authRoutes.js';

import {errorMiddleware} from './interfaces/http/middleware/errorMiddleware.js'

export const app = express();

app.use(express.json());

app.use('/auth', authRoutes);

app.use(errorMiddleware);

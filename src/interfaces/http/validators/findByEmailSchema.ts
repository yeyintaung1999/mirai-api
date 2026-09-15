import { email, z } from 'zod';

export const findByEmailSchema = z.object({
    email: z.string().email()
})

export type FindByEmailRequest = z.infer<typeof findByEmailSchema>;
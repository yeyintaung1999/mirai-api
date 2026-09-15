import {z} from "zod";

export const findByIdSchema = z.object({
    id: z.string()
})

export type FindByIdRequest = z.infer<typeof findByIdSchema>;
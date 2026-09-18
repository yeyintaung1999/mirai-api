import {z} from "zod";

export const findByIdSchema = z.object({
    id: z.uuid()
})

export type FindByIdRequest = z.infer<typeof findByIdSchema>;
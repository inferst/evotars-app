import { z } from 'zod';

export const updateUserSkinCollectionDtoSchema = z
  .object({
    id: z.number().int().min(1),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

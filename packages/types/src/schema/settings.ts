import { z } from 'zod';
import { UpdateSettingsDto } from '../dto/settings';

export const updateSettingsDtoSchema = z.object({
  showAnonymousEvotars: z.boolean().default(false).optional(),
  fallingEvotars: z.boolean().default(true).optional(),
  fallingRaiders: z.boolean().default(false).optional(),
  hiddenUsers: z.string().default('').optional(),
  maxEvotars: z.number().max(1000).positive().default(100).optional(),
  showEmotes: z.boolean().default(true).optional(),
  showMessages: z.boolean().default(true).optional(),
});

export const defaultSettingsValues: UpdateSettingsDto = {
  showAnonymousEvotars: false,
  fallingEvotars: true,
  fallingRaiders: false,
  hiddenUsers: '',
  maxEvotars: 100,
  showEmotes: true,
  showMessages: true,
};

export type UpdateSettingsForm = UpdateSettingsDto;

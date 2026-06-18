import { Settings } from '@repo/database';
import { z } from 'zod';
import {
  defaultSettingsValues,
  updateSettingsDtoSchema,
} from '../schema/settings';

export type UpdateSettingsDto = z.infer<typeof updateSettingsDtoSchema>;

export type SettingsEntity = Settings['data'];

export type ResolvedSettingsEntity = Required<SettingsEntity>;

/**
 * Fills missing settings fields with the single source of truth defaults
 * (`defaultSettingsValues`) so consumers never deal with `undefined`.
 */
export const withSettingsDefaults = (
  data: SettingsEntity,
): ResolvedSettingsEntity =>
  ({ ...defaultSettingsValues, ...data }) as ResolvedSettingsEntity;

import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, 'Érvénytelen azonosító');

export const secretProjectSchema = z.object({
  name: z.string().min(1, 'A név kötelező').max(120, 'A név legfeljebb 120 karakter'),
  description: z.string().max(500, 'A leírás legfeljebb 500 karakter').optional().or(z.literal('')),
});

export const secretItemSchema = z.object({
  key: z
    .string()
    .min(1, 'A kulcs kötelező')
    .max(120, 'A kulcs legfeljebb 120 karakter')
    .regex(/^[A-Za-z0-9_.-]+$/, 'A kulcs csak betűket, számokat, _, . és - jelet tartalmazhat'),
  value: z.string().min(1, 'Az érték kötelező').max(16_000, 'Az érték legfeljebb 16000 karakter'),
  description: z.string().max(500, 'A leírás legfeljebb 500 karakter').optional().or(z.literal('')),
});

export const secretProjectAccessSchema = z.object({
  allowedRoleIds: z.array(objectIdString).default([]),
  allowedUserIds: z.array(objectIdString).default([]),
});

export type SecretProjectInput = z.infer<typeof secretProjectSchema>;
export type SecretItemInput = z.infer<typeof secretItemSchema>;
export type SecretProjectAccessInput = z.infer<typeof secretProjectAccessSchema>;

import { z } from 'zod';

const roleIdsSchema = z.array(z.string().min(1)).default([]);
const directPermissionKeysSchema = z.array(z.string().min(1)).default([]);

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  isActive: z.boolean().default(true),
  roleIds: roleIdsSchema,
  directPermissionKeys: directPermissionKeysSchema,
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .union([z.literal(''), z.string().min(8, 'Password must be at least 8 characters').max(128)])
    .optional(),
  isActive: z.boolean(),
  roleIds: roleIdsSchema,
  directPermissionKeys: directPermissionKeysSchema,
});

export const inviteUserSchema = z.object({
  name: z.string().min(1, 'Név kötelező').max(100),
  email: z.string().email('Érvénytelen e-mail'),
  roleIds: z.array(z.string()).default([]),
  directPermissionKeys: z.array(z.string()).default([]),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const inviteAcceptSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Legalább 8 karakter').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'A jelszavak nem egyeznek',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Legalább 8 karakter').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'A jelszavak nem egyeznek',
    path: ['confirmPassword'],
  });

const optionalObjectId = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : ''))
  .refine((v) => v === '' || /^[a-f\d]{24}$/i.test(v), {
    message: 'Invalid media id',
  })
  .transform((v) => (v === '' ? null : v));

export const brandingUpdateSchema = z.object({
  appName: z.string().min(1, 'App name is required').max(80),
  companyName: z.string().min(1, 'Company name is required').max(120),
  loginTitle: z.string().min(1, 'Login title is required').max(120),
  loginSubtitle: z.string().min(1, 'Login subtitle is required').max(200),
  footerText: z.string().max(300).optional().default(''),
  faviconId: optionalObjectId,
  logoId: optionalObjectId,
  loginBackgroundId: optionalObjectId,
});

export const mailTemplateUpdateSchema = z.object({
  subject: z.string().min(1, 'Tárgy kötelező').max(500),
  body: z.string().min(1, 'Tartalom kötelező'),
  description: z.string().max(1000).optional(),
  enabled: z.boolean(),
  recipientRoleKeys: z.array(z.string()).default([]),
  recipientUserIds: z.array(z.string()).default([]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;
export type MailTemplateUpdateInput = z.infer<typeof mailTemplateUpdateSchema>;

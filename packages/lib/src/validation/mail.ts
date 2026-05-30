import { z } from 'zod';

export const mailTemplateUpdateSchema = z.object({
  subject: z.string().min(1, 'Tárgy kötelező').max(500),
  body: z.string().min(1, 'Tartalom kötelező'),
  description: z.string().max(1000).optional(),
  enabled: z.boolean(),
  recipientRoleKeys: z.array(z.string()).default([]),
  recipientUserIds: z.array(z.string()).default([]),
});

export const inviteUserSchema = z.object({
  name: z.string().min(1, 'Név kötelező').max(100),
  email: z.string().email('Érvénytelen e-mail'),
  roleIds: z.array(z.string()).default([]),
  directPermissionKeys: z.array(z.string()).default([]),
  companyId: z.string().optional(),
  isEmployee: z.boolean().optional(),
  employeeNumber: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  hrNotes: z.string().max(2000).optional(),
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

export type MailTemplateUpdateInput = z.infer<typeof mailTemplateUpdateSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

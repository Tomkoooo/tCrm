import { z } from 'zod';

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

export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;

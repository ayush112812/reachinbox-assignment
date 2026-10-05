import { z } from 'zod';
import { EmailCategory } from '../types/email.types';

const allowedCategories: [EmailCategory, ...EmailCategory[]] = [
  'Interested',
  'Meeting Booked',
  'Not Interested',
  'Spam',
  'Out of Office',
  'Uncategorized'
];

export const emailListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  accountId: z.string().trim().min(1).optional(),
  folder: z.string().trim().min(1).optional(),
  category: z.enum(allowedCategories).optional()
});

export const emailSearchQuerySchema = emailListQuerySchema.extend({
  q: z.string().trim().optional()
});

export type EmailListQuery = z.infer<typeof emailListQuerySchema>;
export type EmailSearchQuery = z.infer<typeof emailSearchQuerySchema>;

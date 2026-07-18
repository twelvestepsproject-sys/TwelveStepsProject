import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

export const leadStatusSchema = z.enum(["new", "contacted", "converted", "archived"]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

/** §6 leads — anon INSERT only via Server Action (§7), never a direct
 * client insert. */
export const leadSchema = z.object({
  id: uuidSchema,
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  phone: z.string(),
  source_page: z.string().nullable(),
  utm: z.record(z.string(), z.string()).nullable(),
  consent_at: timestampSchema,
  status: leadStatusSchema,
  notes: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Lead = z.infer<typeof leadSchema>;

export const leadInputSchema = leadSchema.omit({
  id: true,
  status: true,
  notes: true,
  created_at: true,
  updated_at: true,
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const subscriberStatusSchema = z.enum(["subscribed", "unsubscribed"]);
export type SubscriberStatus = z.infer<typeof subscriberStatusSchema>;

/** §6 newsletter_subscribers — email unique, upsert on conflict. */
export const newsletterSubscriberSchema = z.object({
  id: uuidSchema,
  email: z.email(),
  consent_at: timestampSchema,
  source: z.string().nullable(),
  status: subscriberStatusSchema,
  unsubscribe_token: z.string(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;

export const newsletterSubscribeInputSchema = z.object({
  email: z.email(),
  consent_at: timestampSchema,
  source: z.string().nullable(),
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeInputSchema>;

/** §6 contact_messages. */
export const contactMessageSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  message: z.string(),
  source_page: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type ContactMessage = z.infer<typeof contactMessageSchema>;

export const contactMessageInputSchema = contactMessageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type ContactMessageInput = z.infer<typeof contactMessageInputSchema>;

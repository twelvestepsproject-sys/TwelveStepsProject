import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

export const roleSchema = z.enum(["admin", "editor", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

/**
 * §6 profiles — mirrors auth.users. §8 Users screen: "invite, set role,
 * deactivate (admin only)."
 *
 * ADDED beyond §6's literal field list, additively, to make those two verbs
 * buildable against the mock layer now (see task brief): `email` (§6 says
 * "mirrors auth.users" — auth.users is where the real email lives once
 * Phase 5 exists; until then the profile carries it directly so the Users
 * screen has something to invite/display) and `is_active` (the concrete
 * boolean "deactivate" toggles — §6 doesn't name a column for this, and
 * inventing one is the same kind of justified additive gap as
 * `getPostAdmin`/`listStudyYears` elsewhere in this codebase).
 */
export const profileSchema = z.object({
  id: uuidSchema,
  role: roleSchema,
  full_name: z.string(),
  email: z.email(),
  avatar_id: uuidSchema.nullable(),
  is_active: z.boolean(),
  // True while the account is still on an admin-issued temporary password.
  // Nullish so a row read before migration 35 still parses.
  must_change_password: z.boolean().nullish(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const profileInputSchema = profileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

/** §6 revisions — snapshot every save; restorable from the admin. */
export const revisionSchema = z.object({
  id: uuidSchema,
  entity_type: z.string(),
  entity_id: uuidSchema,
  snapshot: z.record(z.string(), z.unknown()),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
});
export type Revision = z.infer<typeof revisionSchema>;

/** §6 audit_log. */
export const auditLogEntrySchema = z.object({
  id: uuidSchema,
  actor_id: uuidSchema.nullable(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: uuidSchema,
  diff: z.record(z.string(), z.unknown()).nullable(),
  created_at: timestampSchema,
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

/** §6 redirects — admin-editable, applied in middleware. */
export const redirectSchema = z.object({
  id: uuidSchema,
  from_path: z.string(),
  to_path: z.string(),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Redirect = z.infer<typeof redirectSchema>;

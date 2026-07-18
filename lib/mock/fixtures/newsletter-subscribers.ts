import type { NewsletterSubscriber } from "@/lib/schemas";

/**
 * §6 `newsletter_subscribers` — captured data seed set, same reasoning as
 * leads.ts / contact-messages.ts.
 */
export const newsletterSubscribers = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    email: "reut.golan@example.com",
    consent_at: "2026-05-01T08:00:00Z",
    source: "homepage-footer",
    status: "subscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000001",
    created_at: "2026-05-01T08:00:00Z",
    updated_at: "2026-05-01T08:00:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    email: "amit.regev@example.com",
    consent_at: "2026-05-04T09:30:00Z",
    source: "homepage-hero",
    status: "subscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000002",
    created_at: "2026-05-04T09:30:00Z",
    updated_at: "2026-05-04T09:30:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    email: "keren.dagan@example.com",
    consent_at: "2026-05-08T12:10:00Z",
    source: "blog-post",
    status: "unsubscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000003",
    created_at: "2026-05-08T12:10:00Z",
    updated_at: "2026-06-01T07:00:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    email: "gil.nachum@example.com",
    consent_at: "2026-05-12T15:45:00Z",
    source: "homepage-footer",
    status: "subscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000004",
    created_at: "2026-05-12T15:45:00Z",
    updated_at: "2026-05-12T15:45:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    email: "sivan.harel@example.com",
    consent_at: "2026-05-18T10:20:00Z",
    source: "podcast-page",
    status: "subscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000005",
    created_at: "2026-05-18T10:20:00Z",
    updated_at: "2026-05-18T10:20:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000006",
    email: "yael.stern@example.com",
    consent_at: "2026-05-25T14:00:00Z",
    source: "homepage-footer",
    status: "subscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000006",
    created_at: "2026-05-25T14:00:00Z",
    updated_at: "2026-05-25T14:00:00Z",
  },
  {
    id: "b0000000-0000-4000-8000-000000000007",
    email: "boaz.marom@example.com",
    consent_at: "2026-06-02T09:00:00Z",
    source: "homepage-hero",
    status: "unsubscribed",
    unsubscribe_token: "b0000000-0001-4000-8000-000000000007",
    created_at: "2026-06-02T09:00:00Z",
    updated_at: "2026-06-09T08:00:00Z",
  },
] satisfies NewsletterSubscriber[];

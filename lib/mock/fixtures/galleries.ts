import type { Gallery } from "@/lib/schemas";
import { MEDIA_IDS } from "./media";

/**
 * §6 galleries + gallery_images, §5 block 14 (photo gallery).
 *
 * A genuine gap filled during this pass — no `galleries.ts` fixture
 * existed before the 10-remaining-block-types task, so `photo_gallery`
 * had no data to render. Five real, openly-licensed Unsplash photos were
 * downloaded into /lib/mock/fixtures/images/ and logged in
 * docs/licenses.md (verified photographer + license for each via
 * WebFetch, per the same rigor as the existing images) rather than
 * leaving the block silently broken or inventing placeholder imagery.
 *
 * One gallery instance ("hachvana-clip-hits" — informal workshop/community
 * moments) is enough to prove the block's masonry+lightbox rendering path;
 * additional galleries are just more rows later, same pattern as every
 * other repeatable collection in this codebase.
 */
export const galleries = [
  {
    id: "90000000-0000-4000-8000-000000000010",
    slug: "רגעים-מהתהליך",
    title: "רגעים מהתהליך",
    images: [
      {
        id: "90000000-0000-4000-8000-000000000011",
        gallery_id: "90000000-0000-4000-8000-000000000010",
        media_id: MEDIA_IDS.galleryWorkshopRoom,
        alt_he: "קבוצת אנשים יושבת במעגל בחדר סדנה, שיחה משותפת.",
        sort_order: 1,
        created_at: "2025-11-05T08:00:00Z",
        updated_at: "2025-11-05T08:00:00Z",
      },
      {
        id: "90000000-0000-4000-8000-000000000012",
        gallery_id: "90000000-0000-4000-8000-000000000010",
        media_id: MEDIA_IDS.galleryGroupCircleIndoor,
        alt_he: "קבוצת אנשים יושבת במעגל בתוך חלל פנימי, אווירת שיתוף.",
        sort_order: 2,
        created_at: "2025-11-05T08:01:00Z",
        updated_at: "2025-11-05T08:01:00Z",
      },
      {
        id: "90000000-0000-4000-8000-000000000013",
        gallery_id: "90000000-0000-4000-8000-000000000010",
        media_id: MEDIA_IDS.galleryGroupCircleOutdoor,
        alt_he: "קבוצת אנשים יושבת במעגל על הדשא בחוץ, אור יום.",
        sort_order: 3,
        created_at: "2025-11-05T08:02:00Z",
        updated_at: "2025-11-05T08:02:00Z",
      },
      {
        id: "90000000-0000-4000-8000-000000000014",
        gallery_id: "90000000-0000-4000-8000-000000000010",
        media_id: MEDIA_IDS.galleryHandsTogether,
        alt_he: "ידיים רבות מונחות זו על זו במרכז, סמל לתמיכה קהילתית.",
        sort_order: 4,
        created_at: "2025-11-05T08:03:00Z",
        updated_at: "2025-11-05T08:03:00Z",
      },
      {
        id: "90000000-0000-4000-8000-000000000015",
        gallery_id: "90000000-0000-4000-8000-000000000010",
        media_id: MEDIA_IDS.galleryLectureHall,
        alt_he: "אולם הרצאות עם משתתפים יושבים, אווירת למידה.",
        sort_order: 5,
        created_at: "2025-11-05T08:04:00Z",
        updated_at: "2025-11-05T08:04:00Z",
      },
    ],
    is_placeholder: true,
    created_at: "2025-11-05T08:00:00Z",
    updated_at: "2025-11-05T08:00:00Z",
  },
] satisfies Gallery[];

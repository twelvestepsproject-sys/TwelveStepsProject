import type { ProgramStep } from "@/lib/schemas";

/**
 * Stage id constants, duplicated here (not imported from program-stages.ts)
 * to avoid a circular import between the two fixture files — program-
 * stages.ts nests these steps by filtering on stage_id.
 */
const stage1Id = "50000000-0000-4000-8000-000000000001";
const stage2Id = "50000000-0000-4000-8000-000000000002";
const stage3Id = "50000000-0000-4000-8000-000000000003";
const stage4Id = "50000000-0000-4000-8000-000000000004";
const stage5Id = "50000000-0000-4000-8000-000000000005";

/**
 * §5.5 / sample-content-review.md §6: 5 stages, 2/4/3/2/3 steps (14
 * total), Hebrew text copied verbatim from the client-approved sample.
 */
export const programSteps = [
  // שלב 1: הגעה (2 steps)
  {
    id: "51000000-0000-4000-8000-000000000001",
    stage_id: stage1Id,
    step_number: 1,
    title: "לעצור",
    body: "לתת לעצמך רגע לבדוק איפה נמצאים, בלי לשפוט.",
    sort_order: 1,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000002",
    stage_id: stage1Id,
    step_number: 2,
    title: "לבקש עזרה",
    body: "הצעד שבדרך כלל הכי קשה, ומשם הכול נעשה קל יותר.",
    sort_order: 2,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },

  // שלב 2: הבנה (4 steps)
  {
    id: "51000000-0000-4000-8000-000000000003",
    stage_id: stage2Id,
    step_number: 1,
    title: "לזהות דפוס",
    body: "לשים לב לצורה שבה חוזרים ומגיבים במצבים דומים.",
    sort_order: 1,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000004",
    stage_id: stage2Id,
    step_number: 2,
    title: "להבין מקור",
    body: "לחבר בין ההווה לניסיון שעיצב אותו.",
    sort_order: 2,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000005",
    stage_id: stage2Id,
    step_number: 3,
    title: "לתת שם לרגש",
    body: "למצוא מילים למה שקודם היה רק תחושה מעורפלת.",
    sort_order: 3,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000006",
    stage_id: stage2Id,
    step_number: 4,
    title: "לוותר על ההסבר הישן",
    body: "לבחור סיפור חדש על מה שקרה, בלי לזייף את מה שהיה.",
    sort_order: 4,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },

  // שלב 3: שינוי (3 steps)
  {
    id: "51000000-0000-4000-8000-000000000007",
    stage_id: stage3Id,
    step_number: 1,
    title: "לנסות משהו אחר",
    body: "לבחור תגובה שונה במצב מוכר.",
    sort_order: 1,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000008",
    stage_id: stage3Id,
    step_number: 2,
    title: "לטעות ולנסות שוב",
    body: "התהליך לא לינארי, וזה בסדר.",
    sort_order: 2,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000009",
    stage_id: stage3Id,
    step_number: 3,
    title: "לבנות הרגל חדש",
    body: "לתת לבחירה החדשה להפוך לדרך פעולה קבועה.",
    sort_order: 3,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },

  // שלב 4: חיבור (2 steps)
  {
    id: "51000000-0000-4000-8000-000000000010",
    stage_id: stage4Id,
    step_number: 1,
    title: "לשתף מישהו קרוב",
    body: "להביא את מה שנלמד אל תוך מערכת יחסים אמיתית.",
    sort_order: 1,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000011",
    stage_id: stage4Id,
    step_number: 2,
    title: "לקבל תמיכה הדדית",
    body: "ללמוד גם לתת וגם לקבל, לא רק אחד מהם.",
    sort_order: 2,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },

  // שלב 5: המשכיות (3 steps)
  {
    id: "51000000-0000-4000-8000-000000000012",
    stage_id: stage5Id,
    step_number: 1,
    title: "לשמור על המרחב",
    body: "להמשיך לפנות זמן לעצמך גם כשהמשבר חלף.",
    sort_order: 1,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000013",
    stage_id: stage5Id,
    step_number: 2,
    title: "לחזור כשצריך",
    body: "לדעת שאפשר לשוב לכל שלב קודם בלי בושה.",
    sort_order: 2,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: "51000000-0000-4000-8000-000000000014",
    stage_id: stage5Id,
    step_number: 3,
    title: "להעביר הלאה",
    body: "לשתף ממה שנלמד, אם ומתי שרוצים.",
    sort_order: 3,
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
] satisfies ProgramStep[];

import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

export const menuLocationSchema = z.enum(["header", "footer_quick", "mobile"]);
export type MenuLocation = z.infer<typeof menuLocationSchema>;

/** §6 menus + menu_items, self-referencing parent_id. `MenuItem` here is
 * the *resolved nested tree* `getMenu()` returns (§5.5), not the flat row
 * shape — mirrors how the future SQL recursive query will be consumed. */
export interface MenuItem {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  open_in_new_tab: boolean;
  children: MenuItem[];
}

const baseMenuItemFields = {
  id: uuidSchema,
  label: z.string(),
  href: z.string(),
  sort_order: z.number().int(),
  open_in_new_tab: z.boolean(),
};

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    ...baseMenuItemFields,
    children: z.array(menuItemSchema),
  }),
);

/** Flat row shape, matching the `menu_items` table directly — used for
 * admin CRUD (§8 Menus screen) where the tree is edited node by node. */
export const menuItemRowSchema = z.object({
  ...baseMenuItemFields,
  menu_id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type MenuItemRow = z.infer<typeof menuItemRowSchema>;

export const menuSchema = z.object({
  id: uuidSchema,
  location: menuLocationSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Menu = z.infer<typeof menuSchema>;

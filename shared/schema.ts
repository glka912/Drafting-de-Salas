import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Room schema
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  probability: integer("probability").notNull(),
  rarity: text("rarity").notNull(),
  imageUrl: text("image_url").notNull(),
  interiorImageUrl: text("interior_image_url"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  itemsToShow: integer("items_to_show").default(3).notNull(),
  randomizeRepeats: boolean("randomize_repeats").default(true).notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// Items schema (global item storage)
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"), // Description is now optional
  imageUrl: text("image_url").notNull(),
  rarity: text("rarity").notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

// Room Items schema (joins rooms and items with additional properties)
export const roomItems = pgTable("room_items", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  probability: integer("probability").default(100).notNull(),
  canRepeat: boolean("can_repeat").default(true).notNull(),
  maxRepeats: integer("max_repeats").default(1).notNull(),
  isGuaranteed: boolean("is_guaranteed").default(false).notNull(), // Se true, o item sempre aparece
});

export const insertRoomItemSchema = createInsertSchema(roomItems).omit({
  id: true,
});

export type RoomItem = typeof roomItems.$inferSelect;
export type InsertRoomItem = z.infer<typeof insertRoomItemSchema>;

// Define the relations
export const roomsRelations = relations(rooms, ({ many }) => ({
  roomItems: many(roomItems),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  roomItems: many(roomItems),
}));

export const roomItemsRelations = relations(roomItems, ({ one }) => ({
  room: one(rooms, {
    fields: [roomItems.roomId],
    references: [rooms.id],
  }),
  item: one(items, {
    fields: [roomItems.itemId],
    references: [items.id],
  }),
}));

// Color themes schema
export const colorThemes = pgTable("color_themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  primaryColor: text("primary_color").notNull(), // HEX color code
  secondaryColor: text("secondary_color").notNull(), // HEX color code
  accentColor: text("accent_color").notNull(), // HEX color code
  backgroundColor: text("background_color").notNull(), // HEX color code
  textColor: text("text_color").notNull(), // HEX color code
  isDefault: boolean("is_default").default(false).notNull(),
});

export const insertColorThemeSchema = createInsertSchema(colorThemes).omit({
  id: true,
});

export type ColorTheme = typeof colorThemes.$inferSelect;
export type InsertColorTheme = z.infer<typeof insertColorThemeSchema>;

// Combined type for room items with item details
export type RoomItemWithDetails = RoomItem & {
  item: Item;
};

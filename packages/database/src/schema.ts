import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  boolean,
  text,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    storeUrl: text("store_url").notNull().unique(),
    targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
    currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
    lastChecked: timestamp("last_checked"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    storeUrlIdx: index("store_url_idx").on(table.storeUrl),
    isActiveIdx: index("is_active_idx").on(table.isActive),
  })
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("product_id_idx").on(table.productId),
    checkedAtIdx: index("checked_at_idx").on(table.checkedAt),
  })
);

export const crawlJobs = pgTable(
  "crawl_jobs",
  {
    id: serial("id").primaryKey(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    progress: integer("progress").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("status_idx").on(table.status),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'price_drop', 'target_reached', 'unavailable'
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("notification_product_id_idx").on(table.productId),
    isReadIdx: index("is_read_idx").on(table.isRead),
  })
);

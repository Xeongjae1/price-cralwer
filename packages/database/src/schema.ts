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
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 상품 테이블
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    storeUrl: text("store_url").notNull(),
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
    storeUrlUnique: unique("store_url_unique").on(table.storeUrl),
  })
);

// 가격 히스토리 테이블
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
    productIdIdx: index("price_history_product_id_idx").on(table.productId),
    checkedAtIdx: index("price_history_checked_at_idx").on(table.checkedAt),
  })
);

// 크롤링 작업 테이블
export const crawlJobs = pgTable(
  "crawl_jobs",
  {
    id: serial("id").primaryKey(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    progress: integer("progress").default(0).notNull(),
    totalProducts: integer("total_products").default(0).notNull(),
    processedProducts: integer("processed_products").default(0).notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("crawl_jobs_status_idx").on(table.status),
    createdAtIdx: index("crawl_jobs_created_at_idx").on(table.createdAt),
  })
);

// 크롤링 작업 - 상품 관계 테이블
export const crawlJobProducts = pgTable(
  "crawl_job_products",
  {
    id: serial("id").primaryKey(),
    crawlJobId: integer("crawl_job_id")
      .references(() => crawlJobs.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    crawlJobIdIdx: index("crawl_job_products_job_id_idx").on(table.crawlJobId),
    productIdIdx: index("crawl_job_products_product_id_idx").on(
      table.productId
    ),
    statusIdx: index("crawl_job_products_status_idx").on(table.status),
  })
);

// 알림 테이블
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("notifications_product_id_idx").on(table.productId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    typeIdx: index("notifications_type_idx").on(table.type),
  })
);

// Relations 정의
export const productsRelations = relations(products, ({ many }) => ({
  priceHistory: many(priceHistory),
  notifications: many(notifications),
  crawlJobProducts: many(crawlJobProducts),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
}));

export const crawlJobsRelations = relations(crawlJobs, ({ many }) => ({
  crawlJobProducts: many(crawlJobProducts),
}));

export const crawlJobProductsRelations = relations(
  crawlJobProducts,
  ({ one }) => ({
    crawlJob: one(crawlJobs, {
      fields: [crawlJobProducts.crawlJobId],
      references: [crawlJobs.id],
    }),
    product: one(products, {
      fields: [crawlJobProducts.productId],
      references: [products.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  product: one(products, {
    fields: [notifications.productId],
    references: [products.id],
  }),
}));

// 타입 추출
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
export type CrawlJob = typeof crawlJobs.$inferSelect;
export type NewCrawlJob = typeof crawlJobs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

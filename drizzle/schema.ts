import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Transcripts table stores video transcripts and metadata
 */
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  videoId: varchar("videoId", { length: 255 }),
  videoTitle: text("videoTitle"),
  videoUrl: text("videoUrl"),
  sourceType: mysqlEnum("sourceType", ["youtube", "upload"]).notNull(),
  originalLanguage: varchar("originalLanguage", { length: 10 }),
  transcriptText: text("transcriptText").notNull(),
  fileKey: text("fileKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = typeof transcripts.$inferInsert;

/**
 * Translations table stores translated versions of transcripts
 */
export const translations = mysqlTable("translations", {
  id: int("id").autoincrement().primaryKey(),
  transcriptId: int("transcriptId").notNull(),
  targetLanguage: varchar("targetLanguage", { length: 10 }).notNull(),
  translatedText: text("translatedText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

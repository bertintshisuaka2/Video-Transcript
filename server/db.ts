import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transcripts, translations, InsertTranscript, InsertTranslation, Transcript, Translation } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Transcript operations
export async function createTranscript(transcript: InsertTranscript): Promise<Transcript> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transcripts).values(transcript);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(transcripts).where(eq(transcripts.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted transcript");
  
  return inserted[0];
}

export async function getTranscriptById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(transcripts).where(eq(transcripts.id, id)).limit(1);
  return result[0];
}

export async function getUserTranscripts(userId: number): Promise<Transcript[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(transcripts).where(eq(transcripts.userId, userId)).orderBy(desc(transcripts.createdAt));
}

export async function deleteTranscript(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(translations).where(eq(translations.transcriptId, id));
  await db.delete(transcripts).where(and(eq(transcripts.id, id), eq(transcripts.userId, userId)));
}

// Translation operations
export async function createTranslation(translation: InsertTranslation): Promise<Translation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(translations).values(translation);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(translations).where(eq(translations.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted translation");
  
  return inserted[0];
}

export async function getTranslationsByTranscriptId(transcriptId: number): Promise<Translation[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(translations).where(eq(translations.transcriptId, transcriptId));
}

export async function getTranslation(transcriptId: number, targetLanguage: string): Promise<Translation | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(translations)
    .where(and(eq(translations.transcriptId, transcriptId), eq(translations.targetLanguage, targetLanguage)))
    .limit(1);
  
  return result[0];
}

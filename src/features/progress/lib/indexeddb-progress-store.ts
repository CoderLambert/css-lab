import {
  openDB,
  unwrap,
  type DBSchema,
  type IDBPDatabase,
} from "idb";
import { z } from "zod";

import {
  ExerciseProgressSchema,
  type ExerciseProgress,
} from "./progress-schema";
import type {
  ExerciseProgressKey,
  MarkExerciseCompletedInput,
  ProgressStore,
  SaveExerciseDraftInput,
} from "./progress-store";

const DATABASE_NAME = "css-lab";
const DATABASE_VERSION = 2;
const PROGRESS_STORE_NAME = "exercise-progress";

type ExerciseProgressDatabaseKey = [exerciseId: string, revision: number];

interface CssLabProgressDatabase extends DBSchema {
  [PROGRESS_STORE_NAME]: {
    key: ExerciseProgressDatabaseKey;
    value: ExerciseProgress;
  };
}

const LegacyProgressBaseV1Schema = z.strictObject({
  exerciseId: z.string().trim().min(1),
  revision: z.number().int().positive(),
  code: z.string(),
  updatedAt: z.number().int().nonnegative(),
});

const LegacyExerciseProgressV1Schema = z.discriminatedUnion("status", [
  LegacyProgressBaseV1Schema.extend({
    status: z.literal("started"),
  }),
  LegacyProgressBaseV1Schema.extend({
    status: z.literal("completed"),
    completedAt: z.number().int().nonnegative(),
  }),
]);

type LegacyExerciseProgressV1 = z.infer<
  typeof LegacyExerciseProgressV1Schema
>;

let database: IDBPDatabase<CssLabProgressDatabase> | null = null;
let databasePromise: Promise<IDBPDatabase<CssLabProgressDatabase>> | null = null;
let sessionUnavailable = false;
let nextOpenAttemptId = 0;
let activeOpenAttemptId = 0;

class ProgressPersistenceUnavailableError extends Error {
  constructor(message = "Lab progress persistence is unavailable for this session") {
    super(message);
    this.name = "ProgressPersistenceUnavailableError";
  }
}

function createProgressKey(
  exerciseId: string,
  revision: number,
): ExerciseProgressDatabaseKey {
  return [exerciseId, revision];
}

function parseStoredProgress(value: unknown): ExerciseProgress | null {
  const result = ExerciseProgressSchema.safeParse(value);

  return result.success ? result.data : null;
}

function convertLegacyProgress(
  legacy: LegacyExerciseProgressV1,
): ExerciseProgress {
  const base = {
    exerciseId: legacy.exerciseId,
    revision: legacy.revision,
    files: {
      "style.css": legacy.code,
    },
    updatedAt: legacy.updatedAt,
  };

  return legacy.status === "completed"
    ? {
        ...base,
        status: "completed",
        completedAt: legacy.completedAt,
      }
    : {
        ...base,
        status: "started",
      };
}

function migrateVersionOneRecords(transaction: IDBTransaction): void {
  const store = transaction.objectStore(PROGRESS_STORE_NAME);
  const request = store.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;

    if (!cursor) {
      return;
    }

    const legacyResult = LegacyExerciseProgressV1Schema.safeParse(
      cursor.value,
    );

    if (legacyResult.success) {
      cursor.update(convertLegacyProgress(legacyResult.data));
    }

    cursor.continue();
  };
}

function markSessionUnavailable(attemptId: number): void {
  if (attemptId !== activeOpenAttemptId) {
    return;
  }

  sessionUnavailable = true;
  activeOpenAttemptId += 1;
  database?.close();
  database = null;
}

function getDatabase(): Promise<IDBPDatabase<CssLabProgressDatabase>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (sessionUnavailable) {
    return Promise.reject(new ProgressPersistenceUnavailableError());
  }

  if (database) {
    return Promise.resolve(database);
  }

  if (databasePromise) {
    return databasePromise;
  }

  const attemptId = ++nextOpenAttemptId;
  activeOpenAttemptId = attemptId;

  let rejectBlocked:
    | ((reason: ProgressPersistenceUnavailableError) => void)
    | null = null;

  const blockedPromise = new Promise<IDBPDatabase<CssLabProgressDatabase>>(
    (_resolve, reject) => {
      rejectBlocked = reject;
    },
  );

  const rawOpenPromise = openDB<CssLabProgressDatabase>(
    DATABASE_NAME,
    DATABASE_VERSION,
    {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
            db.createObjectStore(PROGRESS_STORE_NAME, {
              keyPath: ["exerciseId", "revision"],
            });
          }

          return;
        }

        if (
          oldVersion === 1 &&
          db.objectStoreNames.contains(PROGRESS_STORE_NAME)
        ) {
          migrateVersionOneRecords(unwrap(transaction));
        }
      },
      blocked() {
        markSessionUnavailable(attemptId);
        rejectBlocked?.(
          new ProgressPersistenceUnavailableError(
            "IndexedDB upgrade is blocked by a legacy connection",
          ),
        );
      },
      blocking() {
        database?.close();
        database = null;
        databasePromise = null;
      },
      terminated() {
        database = null;
        databasePromise = null;
      },
    },
  ).then(
    (openedDatabase) => {
      if (
        sessionUnavailable ||
        attemptId !== activeOpenAttemptId
      ) {
        openedDatabase.close();
        throw new ProgressPersistenceUnavailableError(
          "Discarded a stale IndexedDB open attempt",
        );
      }

      database = openedDatabase;
      return openedDatabase;
    },
    (error: unknown) => {
      throw error;
    },
  );

  const attemptPromise = Promise.race([
    rawOpenPromise,
    blockedPromise,
  ]).catch((error: unknown) => {
    if (databasePromise === attemptPromise) {
      databasePromise = null;
    }

    throw error;
  });

  databasePromise = attemptPromise;

  return attemptPromise;
}

export class IndexedDbProgressStore implements ProgressStore {
  async getExercise(
    exerciseId: string,
    revision: number,
  ): Promise<ExerciseProgress | null> {
    const db = await getDatabase();
    const storedProgress = await db.get(
      PROGRESS_STORE_NAME,
      createProgressKey(exerciseId, revision),
    );

    return parseStoredProgress(storedProgress);
  }

  async getExercises(
    keys: readonly ExerciseProgressKey[],
  ): Promise<ExerciseProgress[]> {
    if (keys.length === 0) {
      return [];
    }

    const db = await getDatabase();
    const transaction = db.transaction(PROGRESS_STORE_NAME, "readonly");
    const storedProgress = await Promise.all(
      keys.map((key) =>
        transaction.store.get(
          createProgressKey(key.exerciseId, key.revision),
        ),
      ),
    );

    await transaction.done;

    return storedProgress.flatMap((value) => {
      const progress = parseStoredProgress(value);

      return progress ? [progress] : [];
    });
  }

  async saveDraft({
    exerciseId,
    revision,
    files,
    updatedAt,
  }: SaveExerciseDraftInput): Promise<void> {
    const db = await getDatabase();
    const transaction = db.transaction(
      PROGRESS_STORE_NAME,
      "readwrite",
    );
    const key = createProgressKey(exerciseId, revision);
    const currentProgress = parseStoredProgress(
      await transaction.store.get(key),
    );

    const nextProgress: ExerciseProgress =
      currentProgress?.status === "completed"
        ? {
            ...currentProgress,
            files: { ...files },
            updatedAt,
          }
        : {
            exerciseId,
            revision,
            files: { ...files },
            status: "started",
            updatedAt,
          };

    await transaction.store.put(
      ExerciseProgressSchema.parse(nextProgress),
    );
    await transaction.done;
  }

  async markCompleted({
    exerciseId,
    revision,
    files,
    updatedAt,
    completedAt,
  }: MarkExerciseCompletedInput): Promise<void> {
    const db = await getDatabase();
    const transaction = db.transaction(
      PROGRESS_STORE_NAME,
      "readwrite",
    );
    const key = createProgressKey(exerciseId, revision);
    const currentProgress = parseStoredProgress(
      await transaction.store.get(key),
    );

    const nextProgress: ExerciseProgress = {
      exerciseId,
      revision,
      files: { ...files },
      status: "completed",
      completedAt:
        currentProgress?.status === "completed"
          ? currentProgress.completedAt
          : completedAt,
      updatedAt,
    };

    await transaction.store.put(
      ExerciseProgressSchema.parse(nextProgress),
    );
    await transaction.done;
  }
}

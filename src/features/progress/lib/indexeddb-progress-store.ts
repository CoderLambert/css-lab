import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from "idb";

import {
  ExerciseProgressSchema,
  type ExerciseProgress,
} from "./progress-schema";
import type {
  MarkExerciseCompletedInput,
  ProgressStore,
  SaveExerciseCodeInput,
} from "./progress-store";

const DATABASE_NAME = "css-lab";
const DATABASE_VERSION = 1;
const PROGRESS_STORE_NAME = "exercise-progress";

type ExerciseProgressDatabaseKey = [exerciseId: string, revision: number];

interface CssLabProgressDatabase extends DBSchema {
  [PROGRESS_STORE_NAME]: {
    key: ExerciseProgressDatabaseKey;
    value: ExerciseProgress;
  };
}

let database: IDBPDatabase<CssLabProgressDatabase> | null = null;
let databasePromise: Promise<IDBPDatabase<CssLabProgressDatabase>> | null = null;

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

function getDatabase(): Promise<IDBPDatabase<CssLabProgressDatabase>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!databasePromise) {
    databasePromise = openDB<CssLabProgressDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(db) {
          if (!db.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
            db.createObjectStore(PROGRESS_STORE_NAME, {
              keyPath: ["exerciseId", "revision"],
            });
          }
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
        database = openedDatabase;
        return openedDatabase;
      },
      (error: unknown) => {
        databasePromise = null;
        throw error;
      },
    );
  }

  return databasePromise;
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

  async saveCode({
    exerciseId,
    revision,
    code,
    updatedAt,
  }: SaveExerciseCodeInput): Promise<void> {
    const db = await getDatabase();
    const transaction = db.transaction(PROGRESS_STORE_NAME, "readwrite");
    const key = createProgressKey(exerciseId, revision);
    const currentProgress = parseStoredProgress(
      await transaction.store.get(key),
    );

    const nextProgress: ExerciseProgress =
      currentProgress?.status === "completed"
        ? {
            ...currentProgress,
            code,
            updatedAt,
          }
        : {
            exerciseId,
            revision,
            code,
            status: "started",
            updatedAt,
          };

    await transaction.store.put(ExerciseProgressSchema.parse(nextProgress));
    await transaction.done;
  }

  async markCompleted({
    exerciseId,
    revision,
    code,
    updatedAt,
    completedAt,
  }: MarkExerciseCompletedInput): Promise<void> {
    const db = await getDatabase();
    const transaction = db.transaction(PROGRESS_STORE_NAME, "readwrite");
    const key = createProgressKey(exerciseId, revision);
    const currentProgress = parseStoredProgress(
      await transaction.store.get(key),
    );

    const nextProgress: ExerciseProgress = {
      exerciseId,
      revision,
      code,
      status: "completed",
      completedAt:
        currentProgress?.status === "completed"
          ? currentProgress.completedAt
          : completedAt,
      updatedAt,
    };

    await transaction.store.put(ExerciseProgressSchema.parse(nextProgress));
    await transaction.done;
  }
}

import { z } from "zod";

import { CommonRecordSchema, NonEmptyStringSchema } from "./common";

export const LessonRecordSchema = CommonRecordSchema.extend({
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  estimatedMinutes: z.number().int().positive(),
}).strict();

export type LessonRecord = z.infer<typeof LessonRecordSchema>;

import { z } from "zod";

import { CommonRecordSchema, NonEmptyStringSchema } from "./common";

export const CourseRecordSchema = CommonRecordSchema.extend({
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
}).strict();

export type CourseRecord = z.infer<typeof CourseRecordSchema>;

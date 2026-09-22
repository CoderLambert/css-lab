import { z } from "zod";

import { CommonRecordSchema, NonEmptyStringSchema } from "./common";

export const ModuleRecordSchema = CommonRecordSchema.extend({
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
}).strict();

export type ModuleRecord = z.infer<typeof ModuleRecordSchema>;

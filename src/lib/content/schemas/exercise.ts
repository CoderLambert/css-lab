import { z } from "zod";

import { WorkspaceDefinitionSchema, WorkspacePathSchema } from "../../workspace/schemas";
import { CommonRecordFields, NonEmptyStringSchema, SchemaVersionV2Schema } from "./common";

const CheckBaseSchema = z.object({
  id: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
}).strict();

export const StyleCheckSchema = CheckBaseSchema.extend({
  type: z.literal("style"),
  selector: NonEmptyStringSchema,
  property: NonEmptyStringSchema,
  equals: NonEmptyStringSchema,
  alsoAccepts: z.array(NonEmptyStringSchema).optional(),
}).strict();

export const ExistsCheckSchema = CheckBaseSchema.extend({
  type: z.literal("exists"),
  selector: NonEmptyStringSchema,
}).strict();

export const CountCheckSchema = CheckBaseSchema.extend({
  type: z.literal("count"),
  selector: NonEmptyStringSchema,
  equals: z.number().int().nonnegative(),
}).strict();

export const CheckSchema = z.discriminatedUnion("type", [
  StyleCheckSchema,
  ExistsCheckSchema,
  CountCheckSchema,
]);

const ExerciseFields = {
  revision: z.number().int().positive(),
  title: NonEmptyStringSchema,
  prompt: NonEmptyStringSchema,
  hints: z.array(NonEmptyStringSchema),
  checks: z.array(CheckSchema),
} as const;

export const BrowserRuntimeDefinitionSchema = z.object({
  type: z.literal("browser"),
  entry: WorkspacePathSchema,
}).strict();

export const ExerciseRecordSchema = z.object({
  schemaVersion: SchemaVersionV2Schema,
  ...CommonRecordFields,
  ...ExerciseFields,
  workspace: WorkspaceDefinitionSchema,
  runtime: BrowserRuntimeDefinitionSchema,
}).strict().superRefine((record, context) => {
  const entry = record.workspace.files.find((file) => file.path === record.runtime.entry);
  if (!entry) {
    context.addIssue({ code: "custom", message: "browser runtime entry must exist in workspace", path: ["runtime", "entry"] });
  } else if (entry.language !== "html") {
    context.addIssue({ code: "custom", message: "browser runtime entry must be an HTML file", path: ["runtime", "entry"] });
  }
});

export const ExerciseRecordV2Schema = ExerciseRecordSchema;

export type StyleCheck = z.infer<typeof StyleCheckSchema>;
export type ExistsCheck = z.infer<typeof ExistsCheckSchema>;
export type CountCheck = z.infer<typeof CountCheckSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;
export type ExerciseRecordV2 = ExerciseRecord;
export type BrowserRuntimeDefinition = z.infer<typeof BrowserRuntimeDefinitionSchema>;

import { z } from "zod";

import { CommonRecordSchema, NonEmptyStringSchema } from "./common";

const CheckBaseSchema = z
  .object({
    id: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
  })
  .strict();

export const StyleCheckSchema = CheckBaseSchema.extend({
  type: z.literal("style"),
  selector: NonEmptyStringSchema,
  property: NonEmptyStringSchema,
  equals: NonEmptyStringSchema,
  alsoAccepts: z.array(NonEmptyStringSchema).optional(),
}).strict();

const RuleStyleCheckFields = {
  selector: NonEmptyStringSchema,
  property: NonEmptyStringSchema,
  equals: NonEmptyStringSchema,
  alsoAccepts: z.array(NonEmptyStringSchema).optional(),
  media: NonEmptyStringSchema.optional(),
  priority: z.enum(["normal", "important"]).optional(),
  afterSelector: NonEmptyStringSchema.optional(),
};

export const RuleStyleCheckSchema = CheckBaseSchema.extend({
  type: z.literal("rule-style"),
  ...RuleStyleCheckFields,
}).strict();

export const ViewportStyleCheckSchema = CheckBaseSchema.extend({
  type: z.literal("viewport-style"),
  viewportWidth: z.number().int().positive(),
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
  RuleStyleCheckSchema,
  ViewportStyleCheckSchema,
  ExistsCheckSchema,
  CountCheckSchema,
]);

export const ExerciseRecordSchema = CommonRecordSchema.extend({
  revision: z.number().int().positive(),
  title: NonEmptyStringSchema,
  prompt: NonEmptyStringSchema,
  hints: z.array(NonEmptyStringSchema),
  checks: z.array(CheckSchema),
}).strict();

export type StyleCheck = z.infer<typeof StyleCheckSchema>;
export type RuleStyleCheck = z.infer<typeof RuleStyleCheckSchema>;
export type ViewportStyleCheck = z.infer<typeof ViewportStyleCheckSchema>;
export type ExistsCheck = z.infer<typeof ExistsCheckSchema>;
export type CountCheck = z.infer<typeof CountCheckSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;

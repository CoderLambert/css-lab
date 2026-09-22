import { z } from "zod";

import {
  CommonRecordSchema,
  NonEmptyStringSchema,
  SlugSchema,
} from "./common";

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
}).strict();

export const ExistsCheckSchema = CheckBaseSchema.extend({
  type: z.literal("exists"),
  selector: NonEmptyStringSchema,
}).strict();

export const CountCheckSchema = CheckBaseSchema.extend({
  type: z.literal("count"),
  selector: NonEmptyStringSchema,
  equals: z.number().int().positive(),
}).strict();

export const CheckSchema = z.discriminatedUnion("type", [
  StyleCheckSchema,
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
export type ExistsCheck = z.infer<typeof ExistsCheckSchema>;
export type CountCheck = z.infer<typeof CountCheckSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;

export { SlugSchema };

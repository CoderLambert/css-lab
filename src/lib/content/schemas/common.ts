import { z } from "zod";

export const SchemaVersionSchema = z.literal(1);
export const SchemaVersionV2Schema = z.literal(2);

export const EntityIdSchema = z.string().trim().min(1, "id must not be empty");

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case lowercase text");

export const EntityStatusSchema = z.enum(["draft", "published"]);
export const NonEmptyStringSchema = z.string().trim().min(1, "must not be empty");

export const CommonRecordFields = {
  id: EntityIdSchema,
  slug: SlugSchema,
  order: z.number().int().positive(),
  status: EntityStatusSchema,
} as const;

export const CommonRecordSchema = z
  .object({ schemaVersion: SchemaVersionSchema, ...CommonRecordFields })
  .strict();

export type EntityStatus = z.infer<typeof EntityStatusSchema>;

import { z } from "zod";

export const SchemaVersionSchema = z.literal(1);

export const EntityIdSchema = z.string().trim().min(1, "id must not be empty");

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case lowercase text");

export const EntityStatusSchema = z.enum(["draft", "published"]);

export const NonEmptyStringSchema = z.string().trim().min(1, "must not be empty");

export const CommonRecordSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: EntityIdSchema,
    slug: SlugSchema,
    order: z.number().int().nonnegative(),
    status: EntityStatusSchema,
  })
  .strict();

export type EntityStatus = z.infer<typeof EntityStatusSchema>;

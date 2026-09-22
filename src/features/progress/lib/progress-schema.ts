import { z } from "zod";

const ProgressBaseSchema = z.strictObject({
  exerciseId: z.string().trim().min(1),
  revision: z.number().int().positive(),
  code: z.string(),
  updatedAt: z.number().int().nonnegative(),
});

const StartedExerciseProgressSchema = ProgressBaseSchema.extend({
  status: z.literal("started"),
});

const CompletedExerciseProgressSchema = ProgressBaseSchema.extend({
  status: z.literal("completed"),
  completedAt: z.number().int().nonnegative(),
});

export const ExerciseProgressSchema = z.discriminatedUnion("status", [
  StartedExerciseProgressSchema,
  CompletedExerciseProgressSchema,
]);

export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>;

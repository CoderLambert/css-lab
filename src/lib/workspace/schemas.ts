import { z } from "zod";

import { isWorkspacePath, workspacePathLanguage } from "./path";

export const WorkspaceLanguageSchema = z.enum(["html", "css", "javascript", "typescript"]);
export const WorkspacePathSchema = z.string().refine(isWorkspacePath, "invalid WorkspacePath");

export const WorkspaceFileDefinitionSchema = z
  .object({
    path: WorkspacePathSchema,
    language: WorkspaceLanguageSchema,
    editable: z.boolean(),
  })
  .strict()
  .refine((file) => workspacePathLanguage(file.path) === file.language, {
    message: "workspace file extension must match language",
    path: ["path"],
  });

export const WorkspaceDefinitionSchema = z
  .object({ files: z.array(WorkspaceFileDefinitionSchema).min(1) })
  .strict()
  .superRefine(({ files }, context) => {
    const exact = new Set<string>();
    const folded = new Map<string, string>();
    files.forEach((file, index) => {
      if (exact.has(file.path)) {
        context.addIssue({ code: "custom", message: `duplicate workspace path: ${file.path}`, path: ["files", index, "path"] });
      }
      exact.add(file.path);
      const lower = file.path.toLowerCase();
      const previous = folded.get(lower);
      if (previous && previous !== file.path) {
        context.addIssue({ code: "custom", message: `case-insensitive workspace path collision: ${previous} / ${file.path}`, path: ["files", index, "path"] });
      }
      folded.set(lower, file.path);
    });
  });

export type WorkspaceDefinitionRecord = z.infer<typeof WorkspaceDefinitionSchema>;

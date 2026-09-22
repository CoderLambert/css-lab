import { readFile } from "node:fs/promises";

import { z } from "zod";

export async function readJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let rawContents: string;

  try {
    rawContents = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read content file: ${filePath}`, { cause: error });
  }

  let parsedContents: unknown;

  try {
    parsedContents = JSON.parse(rawContents) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in content file: ${filePath}`, { cause: error });
  }

  const result = schema.safeParse(parsedContents);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const location = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${location}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Invalid content in ${filePath}\n${issues}`);
  }

  return result.data;
}

export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read content file: ${filePath}`, { cause: error });
  }
}

export function assertSlugMatchesDirectory(
  directoryPath: string,
  metadataPath: string,
  metadataSlug: string,
): void {
  const directorySlug = directoryPath.split(/[\\/]/).at(-1);

  if (directorySlug !== metadataSlug) {
    throw new Error(
      `Content slug mismatch in ${metadataPath}: directory "${directorySlug}" does not match metadata.slug "${metadataSlug}"`,
    );
  }
}

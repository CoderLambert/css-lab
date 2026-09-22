import { lstat, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT";
}

function isContained(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" ||
    (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
}

export async function canonicalContentRoot(configuredRoot: string): Promise<string> {
  const root = await realpath(configuredRoot);
  const info = await lstat(root);
  if (!info.isDirectory()) throw new Error("Configured content root is not a directory");
  return root;
}

export async function safeDirectory(
  root: string,
  segments: readonly string[],
  options: { allowMissing?: boolean } = {},
): Promise<string | null> {
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (options.allowMissing && isMissing(error)) return null;
      throw new Error("Unsafe or missing content directory", { cause: error });
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error("Content directory segment must be a non-symlink directory");
    }
    const resolved = await realpath(current);
    if (!isContained(root, resolved)) throw new Error("Content directory escapes canonical root");
  }
  return current;
}

export async function safeRegularFile(
  root: string,
  segments: readonly string[],
  options: { allowMissing?: boolean } = {},
): Promise<string | null> {
  if (segments.length === 0) throw new Error("Content file path is empty");
  const parent = await safeDirectory(root, segments.slice(0, -1), options);
  if (!parent) return null;
  const filePath = join(parent, segments[segments.length - 1]!);
  let info;
  try {
    info = await lstat(filePath);
  } catch (error) {
    if (options.allowMissing && isMissing(error)) return null;
    throw new Error("Unsafe or missing content file", { cause: error });
  }
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error("Content file must be a non-symlink regular file");
  }
  const resolved = await realpath(filePath);
  if (!isContained(root, resolved)) throw new Error("Content file escapes canonical root");
  return filePath;
}

export async function listSafeDirectoryNames(
  root: string,
  segments: readonly string[],
): Promise<string[]> {
  const directory = await safeDirectory(root, segments);
  const entries = await readdir(directory!, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error("Symlink content entry is not allowed");
    if (entry.isDirectory()) names.push(entry.name);
  }
  return names.toSorted();
}

export async function scanRegularFiles(
  root: string,
  rootSegments: readonly string[],
): Promise<string[]> {
  const base = await safeDirectory(root, rootSegments);
  const output: string[] = [];

  async function walk(directory: string, prefix: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error("Symlink source entry is not allowed");
      const fullPath = join(directory, entry.name);
      const logical = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, logical);
      } else if (entry.isFile()) {
        const resolved = await realpath(fullPath);
        if (!isContained(root, resolved)) throw new Error("Source file escapes canonical root");
        output.push(logical);
      } else {
        throw new Error("Source entry must be a regular file or directory");
      }
    }
  }

  await walk(base!, "");
  return output;
}

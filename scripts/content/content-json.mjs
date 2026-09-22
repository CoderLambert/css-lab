import { readFile } from "node:fs/promises";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES = new Set(["draft", "published"]);

function formatKind(kind) {
  return kind ? `${kind} ` : "";
}

export async function readJsonObject(filePath) {
  let source;

  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read content metadata: ${filePath}`, {
      cause: error,
    });
  }

  let value;

  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in content metadata: ${filePath}`, {
      cause: error,
    });
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Content metadata must be an object: ${filePath}`);
  }

  return value;
}

export function readRequiredString(record, field, filePath) {
  const value = record[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Content metadata field "${field}" must be a non-empty string: ${filePath}`,
    );
  }

  return value.trim();
}

export function readStatus(record, filePath) {
  const value = record.status;

  if (typeof value !== "string" || !STATUSES.has(value)) {
    throw new Error(
      `Content metadata field "status" must be "draft" or "published": ${filePath}`,
    );
  }

  return value;
}

export function readPositiveInteger(record, field, filePath) {
  const value = record[field];

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Content metadata field "${field}" must be a positive integer: ${filePath}`,
    );
  }

  return value;
}

export function assertDirectorySlug(
  directorySlug,
  metadataSlug,
  kind,
  filePath,
) {
  if (!SLUG_PATTERN.test(directorySlug)) {
    throw new Error(
      `Invalid ${formatKind(kind)}directory slug "${directorySlug}": ${filePath}`,
    );
  }

  if (metadataSlug !== directorySlug) {
    throw new Error(
      `${kind} directory slug mismatch: directory "${directorySlug}", metadata "${metadataSlug}", source: ${filePath}`,
    );
  }
}

export async function readEntityMetadata(
  filePath,
  kind,
  { includeOrder = false } = {},
) {
  const record = await readJsonObject(filePath);
  const metadata = {
    slug: readRequiredString(record, "slug", filePath),
    status: readStatus(record, filePath),
  };

  if (includeOrder) {
    metadata.order = readPositiveInteger(record, "order", filePath);
  }

  return {
    kind,
    ...metadata,
  };
}

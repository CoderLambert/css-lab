#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import {
  SOURCE_ROLES,
  assertSlug,
  isDirectExecution,
  isPathInside,
  parseArgs,
  readJson,
  validateSourceExtension,
} from "./lib.mjs";

const LARGE_SOURCE_WARNING_BYTES = 250_000;

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

export async function inspectSourcePack({ manifestPath }) {
  const absoluteManifestPath = resolve(manifestPath);
  const manifest = await readJson(absoluteManifestPath);
  const baseDirectory = dirname(absoluteManifestPath);

  assertPlainObject(manifest, "Source pack");
  if (manifest.schemaVersion !== 1) {
    throw new Error("Source pack schemaVersion must be 1.");
  }

  const id = nonEmptyString(manifest.id, "Source pack id");
  assertPlainObject(manifest.scope, "Source pack scope");

  const scope = {};
  for (const key of ["course", "module", "lesson"]) {
    if (manifest.scope[key] !== undefined) {
      scope[key] = assertSlug(
        nonEmptyString(manifest.scope[key], `scope.${key}`),
        `scope.${key}`,
      );
    }
  }

  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
    throw new Error("Source pack must contain at least one source.");
  }

  const sourceIds = new Set();
  const sources = [];
  const warnings = [];

  for (const source of manifest.sources) {
    assertPlainObject(source, "Source entry");
    const sourceId = nonEmptyString(source.id, "source.id");

    if (sourceIds.has(sourceId)) {
      throw new Error(`Duplicate source id "${sourceId}".`);
    }
    sourceIds.add(sourceId);

    const relativePath = nonEmptyString(source.path, `source "${sourceId}" path`);
    if (isAbsolute(relativePath)) {
      throw new Error(`Source "${sourceId}" path must be relative to the manifest.`);
    }

    const role = nonEmptyString(source.role, `source "${sourceId}" role`);
    if (!SOURCE_ROLES.has(role)) {
      throw new Error(
        `Source "${sourceId}" has unsupported role "${role}". Supported: ${[
          ...SOURCE_ROLES,
        ].join(", ")}.`,
      );
    }

    const absolutePath = resolve(baseDirectory, relativePath);
    if (!isPathInside(baseDirectory, absolutePath) || absolutePath === baseDirectory) {
      throw new Error(
        `Source "${sourceId}" escapes the source-pack directory: ${relativePath}`,
      );
    }

    validateSourceExtension(absolutePath);

    let fileStat;
    try {
      fileStat = await stat(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        throw new Error(`Source "${sourceId}" does not exist: ${absolutePath}`);
      }
      throw error;
    }

    if (!fileStat.isFile()) {
      throw new Error(`Source "${sourceId}" is not a regular file: ${absolutePath}`);
    }

    const bytes = await readFile(absolutePath);
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`Source "${sourceId}" is not valid UTF-8: ${absolutePath}`);
    }

    if (bytes.byteLength > LARGE_SOURCE_WARNING_BYTES) {
      warnings.push(
        `Source "${sourceId}" is ${bytes.byteLength} bytes; read targeted sections instead of loading it blindly.`,
      );
    }

    sources.push({
      id: sourceId,
      role,
      path: relativePath,
      absolutePath,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      notes:
        typeof source.notes === "string" && source.notes.trim()
          ? source.notes.trim()
          : undefined,
    });
  }

  return {
    schemaVersion: 1,
    id,
    scope,
    manifestPath: absoluteManifestPath,
    sources,
    warnings,
  };
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const manifestPath =
    typeof options.manifest === "string" ? options.manifest : positionals[0];

  if (!manifestPath) {
    throw new Error(
      "Usage: inspect-source-pack.mjs --manifest <source-pack.json>",
    );
  }

  const result = await inspectSourcePack({ manifestPath });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

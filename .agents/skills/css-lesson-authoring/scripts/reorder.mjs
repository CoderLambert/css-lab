#!/usr/bin/env node

import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  assertSlug,
  contentPaths,
  findRepoRoot,
  isDirectExecution,
  listLessonRecords,
  listModuleRecords,
  parseArgs,
  positiveInteger,
  readAndValidateRecord,
  requireOption,
} from "./lib.mjs";

function parseOrderMapping(value) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`--orders must be a JSON object: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--orders must be a JSON object mapping slug to positive integer order.");
  }
  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    throw new Error("--orders must contain at least one slug.");
  }
  const mapping = new Map();
  for (const [slug, value] of entries) {
    assertSlug(slug, "order mapping slug");
    mapping.set(slug, positiveInteger(value, `order for ${slug}`));
  }
  return mapping;
}

function validateExistingOrders(records, kind) {
  const seen = new Map();
  for (const record of records) {
    const order = positiveInteger(record.order, `${kind} order for ${record.slug}`);
    if (seen.has(order)) {
      throw new Error(
        `${kind} siblings already contain duplicate order ${order}: "${seen.get(order)}" and "${record.slug}".`,
      );
    }
    seen.set(order, record.slug);
  }
}

export function planOrderChanges(records, mapping, kind) {
  validateExistingOrders(records, kind);
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  for (const slug of mapping.keys()) {
    if (!bySlug.has(slug)) {
      throw new Error(`Unknown ${kind.toLowerCase()} slug "${slug}".`);
    }
  }

  const finalOrders = new Map();
  const plan = [];
  for (const record of records) {
    const to = mapping.has(record.slug) ? mapping.get(record.slug) : record.order;
    if (finalOrders.has(to)) {
      throw new Error(
        `${kind} target order ${to} would collide between "${finalOrders.get(to)}" and "${record.slug}".`,
      );
    }
    finalOrders.set(to, record.slug);
    if (to !== record.order) {
      plan.push({ slug: record.slug, from: record.order, to });
    }
  }
  return plan;
}

async function applyPlanAtomicallyEnough(changes) {
  if (changes.length === 0) return;

  const prepared = [];
  try {
    for (let index = 0; index < changes.length; index += 1) {
      const change = changes[index];
      const source = await readFile(change.path, "utf8");
      const record = JSON.parse(source);
      const content = `${JSON.stringify({ ...record, order: change.to }, null, 2)}\n`;
      const suffix = `.reorder-${process.pid}-${index}`;
      const tempPath = `${change.path}${suffix}.tmp`;
      const backupPath = `${change.path}${suffix}.bak`;
      await writeFile(tempPath, content, "utf8");
      prepared.push({ ...change, tempPath, backupPath });
    }

    const committed = [];
    try {
      for (const item of prepared) {
        await rename(item.path, item.backupPath);
        try {
          await rename(item.tempPath, item.path);
        } catch (error) {
          await rename(item.backupPath, item.path);
          throw error;
        }
        committed.push(item);
      }
    } catch (error) {
      for (const item of committed.reverse()) {
        await rm(item.path, { force: true });
        await rename(item.backupPath, item.path);
      }
      throw error;
    }

    await Promise.all(
      prepared.map((item) => rm(item.backupPath, { force: true }).catch(() => undefined)),
    );
  } finally {
    await Promise.all(
      prepared.flatMap((item) => [
        rm(item.tempPath, { force: true }).catch(() => undefined),
        rm(item.backupPath, { force: true }).catch(() => undefined),
      ]),
    );
  }
}

export async function reorderSiblings({
  repoRoot,
  kind,
  courseSlug,
  moduleSlug,
  orders,
  dryRun = false,
}) {
  assertSlug(courseSlug, "course slug");
  const mapping = orders instanceof Map ? orders : parseOrderMapping(String(orders));
  const paths = contentPaths(repoRoot, courseSlug, moduleSlug || "placeholder");
  await readAndValidateRecord(join(paths.courseRoot, "course.json"), courseSlug, "Course");

  let records;
  let metadataPath;
  if (kind === "module") {
    records = await listModuleRecords(repoRoot, courseSlug);
    metadataPath = (record) =>
      join(paths.courseRoot, "modules", record.directory, "module.json");
  } else if (kind === "lesson") {
    if (!moduleSlug) throw new Error("Lesson reorder requires --module.");
    assertSlug(moduleSlug, "module slug");
    await readAndValidateRecord(join(paths.moduleRoot, "module.json"), moduleSlug, "Module");
    records = await listLessonRecords(repoRoot, courseSlug, moduleSlug);
    metadataPath = (record) =>
      join(paths.lessonsRoot, record.directory, "lesson.json");
  } else {
    throw new Error(`Unsupported reorder kind "${kind}". Use "module" or "lesson".`);
  }

  const label = kind === "module" ? "Module" : "Lesson";
  const plan = planOrderChanges(records, mapping, label);
  if (!dryRun) {
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    await applyPlanAtomicallyEnough(
      plan.map((change) => ({
        ...change,
        path: metadataPath(bySlug.get(change.slug)),
      })),
    );
  }

  return {
    kind,
    dryRun,
    changed: plan.length,
    plan,
  };
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const kind = positionals[0];
  const repoRoot = options.root ? resolve(String(options.root)) : await findRepoRoot();
  const result = await reorderSiblings({
    repoRoot,
    kind,
    courseSlug: requireOption(options, "course"),
    moduleSlug: typeof options.module === "string" ? options.module : undefined,
    orders: requireOption(options, "orders"),
    dryRun: options["dry-run"] === true,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

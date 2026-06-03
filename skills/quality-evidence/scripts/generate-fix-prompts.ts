#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

interface ParsedLine {
  readonly indent: number;
  readonly text: string;
  readonly lineNo: number;
}

interface FixPromptRecord {
  readonly target_id: string;
  readonly target_name: string;
  readonly target_scope: string;
  readonly quality_map: string;
  readonly expectation_id: string;
  readonly expectation_title: string;
  readonly priority: string;
  readonly risk_weight: number;
  readonly scope_label: string;
  readonly scope_value: string;
  readonly problem: string;
  readonly recommended_action: string;
  readonly source_of_truth_inputs: readonly string[];
  readonly quality_expectation: string;
  readonly verification_checks: readonly string[];
  readonly evidence_notes: readonly string[];
  readonly closure_mode: string;
  readonly closure_condition: string;
  readonly non_closing_changes: readonly string[];
  readonly prompt: string;
}

const BAD_COVERAGE = new Set(["PARTIAL", "IMPLICIT", "NOT COVERED", "NOT MEASURED", "MANUAL", "BLOCKED", "DEFERRED", "UNKNOWN", ""]);
const BAD_CONFIDENCE = new Set(["MEDIUM", "LOW", "UNKNOWN", ""]);
const BAD_FRESHNESS = new Set(["STALE"]);
const FAILING_RESULTS = new Set(["FAIL", "PARTIAL", "BLOCKED", "ABORTED"]);
const UNPROVEN_RESULTS = new Set(["SKIPPED", "NOT RUN", "DEFERRED", "UNKNOWN", ""]);
const PRIORITY_RANK = new Map([
  ["P0", 0],
  ["P1", 1],
  ["P2", 2],
  ["P3", 3],
  ["UNKNOWN", 4],
  ["", 4]
]);
const EMPTY_TEXT = new Set(["", "none", "n/a", "na", "null", "unavailable", "unknown", "no residual risk", "no known residual risk"]);
const NON_RUNNABLE_COMMANDS = new Set([
  "no evidence artifact found",
  "see linked artifact or runbook",
  "quality-evidence map generation"
]);

function scalar(value: JsonValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function upper(value: JsonValue | undefined): string {
  return scalar(value).toUpperCase();
}

function lower(value: JsonValue | undefined): string {
  return scalar(value).toLowerCase();
}

function asObject(value: JsonValue | undefined): JsonObject {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function usefulText(value: JsonValue | undefined): boolean {
  const text = scalar(value);
  if (EMPTY_TEXT.has(text.toLowerCase())) {
    return false;
  }
  return !(text.startsWith("<") && text.endsWith(">"));
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function includesStandaloneTerm(value: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9-])${escaped}($|[^a-z0-9-])`).test(value);
}

function includesStandaloneAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => includesStandaloneTerm(value, term));
}

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inDouble) {
      escaped = true;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "#" && !inSingle && !inDouble && (index === 0 || /\s/.test(line[index - 1] ?? ""))) {
      return line.slice(0, index);
    }
  }

  return line;
}

function prepareLines(text: string): ParsedLine[] {
  return text
    .replaceAll("\t", "  ")
    .split(/\r?\n/)
    .map((raw, index) => {
      const withoutComment = stripComment(raw).replace(/\s+$/, "");
      return {
        indent: withoutComment.match(/^ */)?.[0].length ?? 0,
        text: withoutComment.trim(),
        lineNo: index + 1
      };
    })
    .filter((line) => line.text.length > 0);
}

function splitKeyValue(text: string): readonly [string, string] | undefined {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inDouble) {
      escaped = true;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === ":" && !inSingle && !inDouble) {
      const key = text.slice(0, index).trim();
      const value = text.slice(index + 1).trim();
      return key.length === 0 ? undefined : [key, value];
    }
  }

  return undefined;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\"/g, "\"").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function splitInlineList(value: string): string[] {
  const items: string[] = [];
  let start = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inDouble) {
      escaped = true;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "," && !inSingle && !inDouble) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  items.push(value.slice(start).trim());
  return items.filter((item) => item.length > 0);
}

function parseScalar(value: string): JsonValue {
  const text = value.trim();
  if (text === "" || text === "null" || text === "~") {
    return null;
  }
  if (text === "true") {
    return true;
  }
  if (text === "false") {
    return false;
  }
  if (text === "[]") {
    return [];
  }
  if (text === "{}") {
    return {};
  }
  if (text.startsWith("[") && text.endsWith("]")) {
    return splitInlineList(text.slice(1, -1)).map(parseScalar);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return Number(text);
  }
  return unquote(text);
}

function parseNode(lines: readonly ParsedLine[], index: number, indent: number): readonly [JsonValue, number] {
  const line = lines[index];
  if (line === undefined || line.indent < indent) {
    return [{}, index];
  }

  if (line.text.startsWith("- ")) {
    return parseSequence(lines, index, line.indent);
  }

  return parseMapping(lines, index, line.indent);
}

function parseMapping(lines: readonly ParsedLine[], index: number, indent: number): readonly [JsonObject, number] {
  const output: JsonObject = {};
  let cursor = index;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line === undefined || line.indent < indent) {
      break;
    }
    if (line.indent > indent) {
      break;
    }
    if (line.text.startsWith("- ")) {
      break;
    }

    const pair = splitKeyValue(line.text);
    if (pair === undefined) {
      throw new Error(`Unsupported YAML line ${line.lineNo}: ${line.text}`);
    }

    const [key, rawValue] = pair;
    if (rawValue === "") {
      const next = lines[cursor + 1];
      if (next !== undefined && next.indent > line.indent) {
        const [child, nextCursor] = parseNode(lines, cursor + 1, next.indent);
        output[key] = child;
        cursor = nextCursor;
      } else {
        output[key] = {};
        cursor += 1;
      }
    } else if (rawValue === "|" || rawValue === ">") {
      const blockLines: string[] = [];
      cursor += 1;
      while (cursor < lines.length && (lines[cursor]?.indent ?? 0) > line.indent) {
        blockLines.push(lines[cursor]?.text ?? "");
        cursor += 1;
      }
      output[key] = rawValue === ">" ? blockLines.join(" ") : blockLines.join("\n");
    } else {
      const continuedValue = [rawValue];
      cursor += 1;
      while (cursor < lines.length && (lines[cursor]?.indent ?? 0) > line.indent) {
        continuedValue.push(lines[cursor]?.text ?? "");
        cursor += 1;
      }
      output[key] = parseScalar(continuedValue.join(" "));
    }
  }

  return [output, cursor];
}

function parseSequence(lines: readonly ParsedLine[], index: number, indent: number): readonly [JsonValue[], number] {
  const output: JsonValue[] = [];
  let cursor = index;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line === undefined || line.indent < indent) {
      break;
    }
    if (line.indent > indent) {
      break;
    }
    if (!line.text.startsWith("- ")) {
      break;
    }

    const rest = line.text.slice(2).trim();
    if (rest === "") {
      const next = lines[cursor + 1];
      if (next !== undefined && next.indent > line.indent) {
        const [child, nextCursor] = parseNode(lines, cursor + 1, next.indent);
        output.push(child);
        cursor = nextCursor;
      } else {
        output.push(null);
        cursor += 1;
      }
      continue;
    }

    const pair = splitKeyValue(rest);
    if (pair === undefined) {
      output.push(parseScalar(rest));
      cursor += 1;
      continue;
    }

    const [key, rawValue] = pair;
    const item: JsonObject = {};
    item[key] = rawValue === "" ? {} : parseScalar(rawValue);
    cursor += 1;

    const next = lines[cursor];
    if (next !== undefined && next.indent > line.indent) {
      const [continuation, nextCursor] = parseMapping(lines, cursor, next.indent);
      Object.assign(item, continuation);
      cursor = nextCursor;
    }

    output.push(item);
  }

  return [output, cursor];
}

function parseYaml(text: string, path: string): JsonObject {
  const lines = prepareLines(text);
  if (lines.length === 0) {
    return {};
  }
  const [value] = parseNode(lines, 0, lines[0]?.indent ?? 0);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} did not parse to a YAML object.`);
  }
  return value;
}

function loadYaml(path: string): JsonObject {
  return parseYaml(readFileSync(path, "utf8"), path);
}

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function findQualityMaps(repo: string): string[] {
  const roots = ["quality-evidence", "test-quality"].map((root) => resolve(repo, root));
  const maps = roots.flatMap((root) => {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      return [];
    }
    return walkFiles(root).filter((path) => path.endsWith("/quality-map.yaml") || path.endsWith("/quality-map.yml"));
  });

  return [...new Set(maps)].sort();
}

function repoRelative(path: string, repo: string): string {
  const relativePath = relative(repo, path);
  return relativePath.startsWith("..") ? path : relativePath.replaceAll("\\", "/");
}

function dedupe(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const text = value.trim();
    if (text.length === 0 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    unique.push(text);
  }
  return unique;
}

function sourceRefValue(value: JsonValue): string {
  const ref = asObject(value);
  return scalar(ref.path ?? ref.url ?? ref.label);
}

function sourceInputs(repo: string, mapPath: string, target: JsonObject, expectation: JsonObject): string[] {
  const targetId = scalar(target.id);
  const values = [repoRelative(mapPath, repo)];
  values.push(...asArray(target.source_refs).map(sourceRefValue));
  values.push(...asArray(expectation.source_refs).map(sourceRefValue));

  const siblingTestSpec = resolve(dirname(mapPath), "test-spec.md");
  if (existsSync(siblingTestSpec)) {
    values.push(repoRelative(siblingTestSpec, repo));
  }

  for (const task of asArray(expectation.tasks)) {
    const taskPath = scalar(asObject(task).path);
    if (taskPath.length > 0) {
      values.push(taskPath);
    }
  }

  if (targetId.length > 0) {
    for (const filename of ["spec.md", "plan.md", "data-model.md", "quickstart.md", "tasks.md"]) {
      const candidate = resolve(repo, "specs", targetId, filename);
      if (existsSync(candidate)) {
        values.push(repoRelative(candidate, repo));
      }
    }
  }

  return dedupe(values);
}

function isVerificationPath(path: string): boolean {
  return path.startsWith("tests/") || /(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?[jt]sx?|ya?ml)$/.test(path);
}

function isRunnableCommand(command: string): boolean {
  if (!usefulText(command)) {
    return false;
  }
  return !NON_RUNNABLE_COMMANDS.has(command.toLowerCase());
}

function runnableCommands(command: string): string[] {
  if (!isRunnableCommand(command)) {
    return [];
  }
  const parts = command
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length <= 1) {
    return [command];
  }
  return parts.every(isRunnableCommand) ? parts : [command];
}

function verificationDetails(expectation: JsonObject): { checks: string[]; notes: string[] } {
  const checks: string[] = [];
  const notes: string[] = [];
  for (const evidence of asArray(expectation.evidence)) {
    const data = asObject(evidence);
    const command = scalar(data.command);
    const path = scalar(data.path);
    const commands = runnableCommands(command);
    if (commands.length > 0) {
      checks.push(...commands);
    } else if (usefulText(command)) {
      notes.push(command);
    }
    if (path.length > 0 && isVerificationPath(path)) {
      checks.push(path);
    }
  }
  return {
    checks: dedupe(checks),
    notes: dedupe(notes)
  };
}

function evidenceStatus(evidence: JsonObject): string {
  const latest = asObject(evidence.latest_result);
  return upper(latest.status ?? evidence.reliability);
}

function hasDirectPassingEvidence(expectation: JsonObject): boolean {
  return asArray(expectation.evidence).some((evidenceValue) => {
    const evidence = asObject(evidenceValue);
    return lower(evidence.depth) === "direct" && evidenceStatus(evidence) === "PASS";
  });
}

function hasWeakEvidence(expectation: JsonObject): boolean {
  const evidenceEntries = asArray(expectation.evidence).map(asObject);
  if (evidenceEntries.length === 0 || hasDirectPassingEvidence(expectation)) {
    return false;
  }

  return evidenceEntries.some((evidence) => {
    const depth = lower(evidence.depth);
    const type = lower(evidence.type);
    const state = evidenceStatus(evidence).toLowerCase();

    return (
      depth.length === 0 ||
      includesAny(depth, ["manual", "static", "indirect", "implicit", "unknown"]) ||
      includesAny(type, ["manual", "static"]) ||
      includesAny(state, ["not run", "unknown", "skipped"])
    );
  });
}

function hasManualOnlyEvidence(expectation: JsonObject): boolean {
  const evidenceEntries = asArray(expectation.evidence).map(asObject);
  return evidenceEntries.length > 0 &&
    !hasDirectPassingEvidence(expectation) &&
    evidenceEntries.every((evidence) => includesAny(`${lower(evidence.type)} ${lower(evidence.depth)}`, ["manual"]));
}

function hasOpenRiskLanguage(expectation: JsonObject): boolean {
  const evaluation = asObject(expectation.evaluation);
  const text = [
    scalar(evaluation.residual_risk),
    scalar(evaluation.next_best_proof),
    scalar(evaluation.freshness),
    ...asArray(expectation.evidence).flatMap((evidenceValue) => {
      const evidence = asObject(evidenceValue);
      const latest = asObject(evidence.latest_result);
      return [
        scalar(evidence.type),
        scalar(evidence.depth),
        scalar(evidence.reliability),
        scalar(evidence.path),
        scalar(evidence.url),
        scalar(evidence.command),
        scalar(latest.status),
        scalar(latest.run_at),
        scalar(latest.commit)
      ];
    })
  ].join(" ").toLowerCase();

  return includesStandaloneAny(text, ["blocked", "deferred", "stale"]);
}

function hasMissingEvidence(expectation: JsonObject): boolean {
  return asArray(expectation.evidence).length === 0;
}

function hasFailingEvidence(expectation: JsonObject): boolean {
  return asArray(expectation.evidence).some((evidenceValue) => {
    const evidence = asObject(evidenceValue);
    return FAILING_RESULTS.has(evidenceStatus(evidence));
  });
}

function hasBlockedOrDeferredLanguage(expectation: JsonObject): boolean {
  const evaluation = asObject(expectation.evaluation);
  const text = [
    scalar(evaluation.residual_risk),
    scalar(evaluation.next_best_proof),
    ...asArray(expectation.evidence).flatMap((evidenceValue) => {
      const evidence = asObject(evidenceValue);
      const latest = asObject(evidence.latest_result);
      return [
        scalar(evidence.reliability),
        scalar(latest.status)
      ];
    })
  ].join(" ").toLowerCase();

  return includesStandaloneAny(text, ["blocked", "deferred"]);
}

function evidenceDepthSummary(expectation: JsonObject): string {
  const depths = dedupe(
    asArray(expectation.evidence)
      .map((evidenceValue) => scalar(asObject(evidenceValue).depth))
      .filter((depth) => depth.length > 0)
  );

  return depths.length === 0 ? "current evidence" : depths.join(", ");
}

function expectationNeedsFix(expectation: JsonObject, includeCovered: boolean): boolean {
  if (includeCovered) {
    return true;
  }
  if (scalar(expectation.id).startsWith("<")) {
    return false;
  }

  const evaluation = asObject(expectation.evaluation);
  if (BAD_COVERAGE.has(upper(evaluation.coverage_status))) {
    return true;
  }
  if (BAD_CONFIDENCE.has(upper(evaluation.confidence))) {
    return true;
  }
  if (BAD_FRESHNESS.has(upper(evaluation.freshness))) {
    return true;
  }
  if (hasOpenRiskLanguage(expectation)) {
    return true;
  }
  if (hasManualOnlyEvidence(expectation) || hasWeakEvidence(expectation)) {
    return true;
  }

  return hasActionableBadResult(expectation);
}

function hasActionableBadResult(expectation: JsonObject): boolean {
  let hasPassingEvidence = false;
  let hasUnprovenEvidence = false;

  for (const evidenceValue of asArray(expectation.evidence)) {
    const evidence = asObject(evidenceValue);
    const latest = asObject(evidence.latest_result);
    const status = upper(latest.status);

    if (status === "PASS") {
      hasPassingEvidence = true;
      continue;
    }

    if (FAILING_RESULTS.has(status)) {
      return true;
    }

    if (UNPROVEN_RESULTS.has(status)) {
      if (evidence.ci_gated === true) {
        return true;
      }
      hasUnprovenEvidence = true;
    }
  }

  return hasUnprovenEvidence && !hasPassingEvidence;
}

function closureMode(expectation: JsonObject): string {
  const evaluation = asObject(expectation.evaluation);

  if (hasMissingEvidence(expectation)) {
    return "missing_evidence";
  }
  if (hasFailingEvidence(expectation)) {
    return "failing_verification";
  }
  if (BAD_FRESHNESS.has(upper(evaluation.freshness))) {
    return "stale_evidence";
  }
  if (hasManualOnlyEvidence(expectation) || hasWeakEvidence(expectation)) {
    return "proof_upgrade";
  }
  if (hasBlockedOrDeferredLanguage(expectation)) {
    return "blocked_or_deferred";
  }
  if (hasActionableBadResult(expectation)) {
    return "verification_run";
  }

  return "general_gap";
}

function closureCondition(expectation: JsonObject): string {
  const mode = closureMode(expectation);
  const action = recommendedActionText(expectation);

  if (mode === "missing_evidence") {
    return "On the next scan, this quality check must include linked proof with a current passing result instead of remaining unmapped or empty.";
  }
  if (mode === "failing_verification") {
    return "On the next scan, the linked failing verification must pass and this quality check must stop reporting failing or partial proof.";
  }
  if (mode === "stale_evidence") {
    return "On the next scan, rerun or replace the stale proof so freshness is current and the quality check no longer reports stale evidence.";
  }
  if (mode === "proof_upgrade") {
    return `On the next scan, this quality check must gain stronger direct passing proof than the current ${evidenceDepthSummary(expectation)} evidence.`;
  }
  if (mode === "blocked_or_deferred") {
    return `On the next scan, the blocked or deferred condition must be removed or replaced with current passing proof. ${action}`;
  }
  if (mode === "verification_run") {
    return "On the next scan, the linked verification must produce current passing proof instead of skipped, deferred, unknown, or not-run status.";
  }

  return "On the next scan, this quality check must no longer appear as open evidence work.";
}

function nonClosingChanges(expectation: JsonObject): string[] {
  const changes = [
    "Editing quality-map.yaml, test-spec.md, or test-report.md without changing the underlying proof.",
    "Stopping after wording cleanup because the evidence description sounds more accurate."
  ];
  const mode = closureMode(expectation);

  if (mode === "proof_upgrade") {
    changes.push("Refreshing or reframing the current weak, manual, static, or indirect evidence without adding stronger direct passing proof.");
  }
  if (mode === "missing_evidence") {
    changes.push("Leaving the quality check without a linked passing artifact, command result, or test path.");
  }
  if (mode === "failing_verification" || mode === "verification_run" || mode === "stale_evidence") {
    changes.push("Updating quality evidence files before rerunning the mapped verification checks.");
  }

  return dedupe(changes);
}

function problemText(expectation: JsonObject): string {
  const evaluation = asObject(expectation.evaluation);
  if (usefulText(evaluation.residual_risk)) {
    return scalar(evaluation.residual_risk);
  }

  const title = scalar(expectation.title) || scalar(expectation.id);
  const coverage = scalar(evaluation.coverage_status) || "UNKNOWN";
  const confidence = scalar(evaluation.confidence) || "UNKNOWN";
  return `Current evidence for ${title} is ${coverage} with ${confidence} confidence.`;
}

function fallbackRecommendedAction(expectation: JsonObject, mode: string): string {
  if (mode === "missing_evidence") {
    return "Add linked proof with a current passing result and rerun the mapped verification checks.";
  }
  if (mode === "failing_verification") {
    return "Fix the failing verification, rerun it, and update quality evidence only after the proof passes.";
  }
  if (mode === "stale_evidence") {
    return "Rerun or replace the stale proof with current passing evidence and rerun the mapped verification checks.";
  }
  if (mode === "proof_upgrade") {
    return `Add stronger direct passing proof than the current ${evidenceDepthSummary(expectation)} evidence and rerun the mapped verification checks.`;
  }
  if (mode === "blocked_or_deferred") {
    return "Remove the blocked or deferred condition by obtaining current passing proof or the missing dependency, then rerun the mapped verification checks.";
  }
  if (mode === "verification_run") {
    return "Run or rerun the mapped verification until it produces current passing proof, then update quality evidence.";
  }

  return "No source-provided recommended action. Use the source-of-truth inputs to identify the smallest evidence or implementation change that closes the gap.";
}

function sourceActionMatchesClosure(action: string, mode: string): boolean {
  const normalized = action.toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  if (includesAny(normalized, [
    "rely on the feature's runtime behavior checks",
    "rely on runtime behavior checks",
    "tracked separately",
    "keep the documented source of truth updated"
  ])) {
    return false;
  }

  if (mode === "proof_upgrade") {
    return includesAny(normalized, [
      "add", "capture", "collect", "record", "upgrade", "direct proof",
      "direct passing proof", "runtime proof", "integration", "browser",
      "e2e", "coverage", "rerun", "run"
    ]);
  }
  if (mode === "missing_evidence") {
    return includesAny(normalized, ["add", "attach", "capture", "collect", "record", "rerun", "run"]);
  }
  if (mode === "failing_verification" || mode === "verification_run") {
    return includesAny(normalized, ["fix", "rerun", "run", "pass", "repair"]);
  }
  if (mode === "stale_evidence") {
    return includesAny(normalized, ["rerun", "replace", "refresh", "capture", "collect"]);
  }
  if (mode === "blocked_or_deferred") {
    return includesAny(normalized, ["unblock", "restore", "provision", "rerun", "run", "capture", "collect", "replace"]);
  }

  return true;
}

function recommendedActionText(expectation: JsonObject): string {
  const evaluation = asObject(expectation.evaluation);
  const mode = closureMode(expectation);
  const sourceAction = usefulText(evaluation.next_best_proof) ? scalar(evaluation.next_best_proof) : "";

  if (sourceActionMatchesClosure(sourceAction, mode)) {
    return sourceAction;
  }

  return fallbackRecommendedAction(expectation, mode);
}

function scopeLine(target: JsonObject): readonly [string, string] {
  const targetId = scalar(target.id);
  const targetName = scalar(target.name) || targetId || "unknown target";
  if (targetId.length > 0 && targetId !== targetName) {
    return ["Affected feature", `${targetId} - ${targetName}`];
  }
  return ["Affected feature", targetName];
}

function priorityRank(priority: string): number {
  return PRIORITY_RANK.get(priority.toUpperCase()) ?? (PRIORITY_RANK.get("") ?? 4);
}

function riskWeight(expectation: JsonObject): number {
  const raw = asObject(expectation.risk).weight;
  if (typeof raw === "number") {
    return raw;
  }
  const parsed = Number(scalar(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPrompt(record: Omit<FixPromptRecord, "prompt">): string {
  const checks = record.verification_checks.length === 0
    ? ["No exact verification command or test path is mapped."]
    : record.verification_checks;
  const lines = [
    "Fix the evidence gap in this repo.",
    "",
    `${record.scope_label}: ${record.scope_value}`,
    "",
    `Problem: ${record.problem}`,
    "",
    `Recommended action: ${record.recommended_action}`,
    "",
    "Source-of-truth inputs:",
    ...record.source_of_truth_inputs.map((item) => `- ${item}`),
    "",
    "Quality check:",
    `- ${record.quality_expectation}`,
    "",
    `Closure mode: ${record.closure_mode}`,
    "",
    `Closure condition on next scan: ${record.closure_condition}`,
    "",
    "Changes that do not count as success by themselves:",
    ...record.non_closing_changes.map((item) => `- ${item}`),
    "",
    ...(record.evidence_notes.length === 0 ? [] : [
      "Evidence notes:",
      ...record.evidence_notes.map((item) => `- ${item}`),
      ""
    ]),
    "Verification checks to rerun:",
    ...checks.map((item) => `- ${item}`),
    "",
    "Task:",
    "Close the evidence gap in the smallest correct way. Establish the concrete root cause from the source-of-truth inputs, change implementation only when the inputs prove a product defect, add or update regression/manual evidence when needed, rerun the verification checks, and treat this task as complete only if the next scan stops reporting this quality check as open."
  ];
  return lines.join("\n");
}

function collectPrompts(repo: string, includeCovered: boolean, targetFilter: string | undefined): FixPromptRecord[] {
  const records: FixPromptRecord[] = [];

  for (const mapPath of findQualityMaps(repo)) {
    const data = loadYaml(mapPath);
    const target = asObject(data.target);
    if (targetFilter !== undefined && scalar(target.id) !== targetFilter) {
      continue;
    }

    for (const expectationValue of asArray(data.expectations)) {
      const expectation = asObject(expectationValue);
      if (!expectationNeedsFix(expectation, includeCovered)) {
        continue;
      }

      const expectationId = scalar(expectation.id);
      if (expectationId.length === 0) {
        continue;
      }

      const [scopeLabel, scopeValue] = scopeLine(target);
      const qualityMap = repoRelative(mapPath, repo);
      const verification = verificationDetails(expectation);
      const partialRecord: Omit<FixPromptRecord, "prompt"> = {
        target_id: scalar(target.id),
        target_name: scalar(target.name),
        target_scope: scalar(target.scope),
        quality_map: qualityMap,
        expectation_id: expectationId,
        expectation_title: scalar(expectation.title),
        priority: scalar(expectation.priority) || "UNKNOWN",
        risk_weight: riskWeight(expectation),
        scope_label: scopeLabel,
        scope_value: scopeValue,
        problem: problemText(expectation),
        recommended_action: recommendedActionText(expectation),
        source_of_truth_inputs: sourceInputs(repo, mapPath, target, expectation),
        quality_expectation: `${qualityMap}#expectation:${expectationId}`,
        verification_checks: verification.checks,
        evidence_notes: verification.notes,
        closure_mode: closureMode(expectation),
        closure_condition: closureCondition(expectation),
        non_closing_changes: nonClosingChanges(expectation)
      };
      records.push({
        ...partialRecord,
        prompt: buildPrompt(partialRecord)
      });
    }
  }

  return records.sort((left, right) => {
    const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    const riskDelta = right.risk_weight - left.risk_weight;
    if (riskDelta !== 0) {
      return riskDelta;
    }
    const targetDelta = left.target_id.localeCompare(right.target_id);
    return targetDelta === 0 ? left.expectation_id.localeCompare(right.expectation_id) : targetDelta;
  });
}

function renderMarkdown(repo: string, records: readonly FixPromptRecord[]): string {
  const lines = [
    "# Quality Evidence Fix Prompts",
    "",
    `Repo: \`${repo}\``,
    `Prompts: ${records.length}`,
    ""
  ];

  if (records.length === 0) {
    lines.push("No evidence gaps were found in quality-map evaluations.", "");
    return lines.join("\n");
  }

  records.forEach((record, index) => {
    const title = record.expectation_title || record.expectation_id;
    lines.push(
      `## ${index + 1}. ${record.priority} ${record.target_id} / ${title}`,
      "",
      `- Quality map: \`${record.quality_map}\``,
      `- Quality check: \`${record.expectation_id}\``,
      `- Risk weight: ${record.risk_weight}`,
      "",
      "```text",
      record.prompt,
      "```",
      ""
    );
  });

  return lines.join("\n");
}

function outputPath(repo: string, output: string): string {
  return isAbsolute(output) ? output : resolve(repo, output);
}

interface Args {
  repo: string;
  format: "markdown" | "json";
  output?: string;
  limit?: number;
  target?: string;
  includeCovered: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    repo: ".",
    format: "markdown",
    includeCovered: false
  };
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--format") {
      const value = argv[++index];
      if (value !== "markdown" && value !== "json") {
        throw new Error("--format must be markdown or json.");
      }
      args.format = value;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[++index];
      continue;
    }
    if (arg === "--limit") {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("--limit must be a non-negative integer.");
      }
      args.limit = value;
      continue;
    }
    if (arg === "--target") {
      args.target = argv[++index];
      continue;
    }
    if (arg === "--include-covered") {
      args.includeCovered = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length > 1) {
    throw new Error("Only one repo path can be provided.");
  }
  if (positional[0] !== undefined) {
    args.repo = positional[0];
  }

  return args;
}

function printHelp(): void {
  console.log(`Generate coding-agent fix prompts from quality-evidence quality maps.

Usage:
  generate-fix-prompts <repo-root> [options]

Options:
  --format markdown|json   Output format. Default: markdown.
  --output <path>          Write output to a file instead of stdout.
  --limit <n>              Emit only the highest-priority n prompts.
  --target <target-id>     Emit prompts for one quality-map target id.
  --include-covered        Include covered/high-confidence quality checks and future proof recommendations too.
  --help                   Show this help.
`);
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo);
  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    throw new Error(`Repo path is not a directory: ${repo}`);
  }

  let records = collectPrompts(repo, args.includeCovered, args.target);
  if (args.limit !== undefined) {
    records = records.slice(0, args.limit);
  }

  const output = args.format === "json"
    ? JSON.stringify(records, null, 2)
    : renderMarkdown(repo, records);

  if (args.output !== undefined) {
    const path = outputPath(repo, args.output);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${output}\n`, "utf8");
  } else {
    console.log(output);
  }

  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

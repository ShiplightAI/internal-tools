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

const OPEN_DEPTHS = new Set(["MISSING", "BLOCKED"]);
const WEAK_DEPTHS = new Set(["STATIC", "MANUAL", "INDIRECT", "IMPLICIT", "UNKNOWN", ""]);
const GATE_CONTEXT_HINT = /(?:^|[-_])(ci|gate|smoke|release)(?:$|[-_])/i;
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
  const roots = ["quality-evidence"].map((root) => resolve(repo, root));
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

  for (const filename of ["quality-policy.yaml", "quality-policy.yml"]) {
    const candidate = resolve(repo, filename);
    if (existsSync(candidate)) {
      values.push(repoRelative(candidate, repo));
    }
  }

  return dedupe(values);
}

function isVerificationPath(path: string): boolean {
  return path.startsWith("tests/") || /(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?[jt]sx?|ya?ml)$/.test(path);
}

// Smoke/health-check evidence points `path` at a CI workflow file and uses
// `command` as a human pointer to the step (not an executable command). It is
// backed at runtime by an observation source, not by rerunning a command, so its
// command must not be surfaced as a "verification check to rerun".
function isWorkflowPath(path: string): boolean {
  return /(?:^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(path);
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
    const url = scalar(data.url);
    const noteText = scalar(data.notes);
    // For workflow-backed checks, `command` is a human pointer, not runnable.
    const commands = isWorkflowPath(path) ? [] : runnableCommands(command);
    if (commands.length > 0) {
      checks.push(...commands);
    } else if (usefulText(command)) {
      notes.push(command);
    }
    if (path.length > 0 && isVerificationPath(path)) {
      checks.push(path);
    }
    if (usefulText(url)) {
      notes.push(url);
    }
    if (usefulText(noteText)) {
      notes.push(noteText);
    }
  }
  return {
    checks: dedupe(checks),
    notes: dedupe(notes)
  };
}

function evidenceEntries(expectation: JsonObject): JsonObject[] {
  return asArray(expectation.evidence).map(asObject);
}

function proofGap(expectation: JsonObject): JsonObject {
  return asObject(expectation.proof_gap);
}

function proofGapSummary(expectation: JsonObject): string {
  return scalar(proofGap(expectation).summary);
}

function proofGapNextStep(expectation: JsonObject): string {
  return scalar(proofGap(expectation).next_step);
}

function normalizedTextList(value: JsonValue | undefined): string[] {
  return dedupe(asArray(value).map((entry) => scalar(entry).toLowerCase()).filter((entry) => entry.length > 0));
}

function directEvidenceCount(expectation: JsonObject): number {
  return evidenceEntries(expectation).filter((evidence) => upper(evidence.depth) === "DIRECT").length;
}

function hasOpenProofGap(expectation: JsonObject): boolean {
  return usefulText(proofGapSummary(expectation)) || usefulText(proofGapNextStep(expectation));
}

function hasMissingEvidence(expectation: JsonObject): boolean {
  return evidenceEntries(expectation).length === 0;
}

function hasDepth(expectation: JsonObject, depth: string): boolean {
  return evidenceEntries(expectation).some((evidence) => upper(evidence.depth) === depth);
}

function policyOverride(expectation: JsonObject): JsonObject {
  return asObject(expectation.policy_override);
}

function coveredModalities(expectation: JsonObject): Set<string> {
  return new Set(evidenceEntries(expectation).map((evidence) => lower(evidence.type)).filter((type) => type.length > 0));
}

function coveredContexts(expectation: JsonObject): Set<string> {
  const contexts = evidenceEntries(expectation).flatMap((evidence) => normalizedTextList(evidence.contexts));
  return new Set(contexts);
}

function missingRequiredModalities(expectation: JsonObject): string[] {
  const required = normalizedTextList(policyOverride(expectation).required_modalities);
  const covered = coveredModalities(expectation);
  return required.filter((modality) => !covered.has(modality));
}

function missingRequiredContexts(expectation: JsonObject): string[] {
  const required = normalizedTextList(policyOverride(expectation).required_contexts);
  const covered = coveredContexts(expectation);
  return required.filter((context) => !covered.has(context));
}

function needsDirectEvidenceByPolicy(expectation: JsonObject): boolean {
  const policy = policyOverride(expectation);
  return policy.require_direct_evidence === true || upper(policy.minimum_depth) === "DIRECT";
}

function hasGateContext(expectation: JsonObject): boolean {
  return [...coveredContexts(expectation)].some((context) => GATE_CONTEXT_HINT.test(context));
}

function policyGapReasons(expectation: JsonObject): string[] {
  const reasons: string[] = [];
  const policy = policyOverride(expectation);
  const requiredModalities = missingRequiredModalities(expectation);
  const requiredContexts = missingRequiredContexts(expectation);

  if (requiredModalities.length > 0) {
    reasons.push(`required modalities missing: ${requiredModalities.join(", ")}`);
  }
  if (requiredContexts.length > 0) {
    reasons.push(`required contexts missing: ${requiredContexts.join(", ")}`);
  }
  if (needsDirectEvidenceByPolicy(expectation) && directEvidenceCount(expectation) === 0) {
    reasons.push("declared policy requires direct evidence");
  }
  if (policy.require_multi_layer === true && coveredModalities(expectation).size < 2) {
    reasons.push("declared policy requires multiple proof layers");
  }
  if (policy.require_gate === true && !hasGateContext(expectation)) {
    reasons.push("declared policy requires a gate-capable proof context");
  }

  return reasons;
}

function hasPolicyGap(expectation: JsonObject): boolean {
  return policyGapReasons(expectation).length > 0;
}

function hasWeakEvidence(expectation: JsonObject): boolean {
  const entries = evidenceEntries(expectation);
  if (entries.length === 0 || directEvidenceCount(expectation) > 0) {
    return false;
  }

  return entries.some((evidence) => {
    const depth = upper(evidence.depth);
    const type = lower(evidence.type);
    return WEAK_DEPTHS.has(depth) || type === "manual" || type === "static";
  });
}

function evidenceDepthSummary(expectation: JsonObject): string {
  const depths = dedupe(
    evidenceEntries(expectation)
      .map((evidence) => scalar(evidence.depth))
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

  if (hasMissingEvidence(expectation)) {
    return true;
  }
  if (hasDepth(expectation, "BLOCKED") || hasDepth(expectation, "MISSING")) {
    return true;
  }
  if (hasPolicyGap(expectation)) {
    return true;
  }
  if (hasOpenProofGap(expectation)) {
    return true;
  }
  if (hasWeakEvidence(expectation)) {
    return true;
  }

  return false;
}

function closureMode(expectation: JsonObject): string {
  if (hasMissingEvidence(expectation)) {
    return "missing_evidence";
  }
  if (hasDepth(expectation, "BLOCKED")) {
    return "blocked_proof";
  }
  if (hasDepth(expectation, "MISSING")) {
    return "missing_proof";
  }
  if (hasPolicyGap(expectation)) {
    return "policy_gap";
  }
  if (hasWeakEvidence(expectation)) {
    return "proof_upgrade";
  }
  if (hasOpenProofGap(expectation)) {
    return "proof_gap";
  }
  return "general_gap";
}

function closureCondition(expectation: JsonObject): string {
  const mode = closureMode(expectation);
  const policyReasons = policyGapReasons(expectation).join("; ");

  if (mode === "missing_evidence") {
    return "On the next scan, this quality check must include at least one linked proof definition instead of remaining unmapped or empty.";
  }
  if (mode === "blocked_proof") {
    return "On the next scan, the blocked proof entry must be replaced with concrete proof or unblocked so the quality check no longer depends on `BLOCKED` evidence.";
  }
  if (mode === "missing_proof") {
    return "On the next scan, the `MISSING` placeholder must be replaced with concrete proof definitions and linked verification paths or commands.";
  }
  if (mode === "policy_gap") {
    return `On the next scan, the proof set must satisfy the declared policy posture: ${policyReasons}.`;
  }
  if (mode === "proof_upgrade") {
    return `On the next scan, this quality check must gain stronger direct proof than the current ${evidenceDepthSummary(expectation)} evidence.`;
  }
  if (mode === "proof_gap") {
    return "On the next scan, this quality check must no longer report an open proof gap and should link the proof described by the recommended next step.";
  }
  return "On the next scan, this quality check must no longer appear as open evidence work.";
}

function nonClosingChanges(expectation: JsonObject): string[] {
  const changes = [
    "Editing quality-map.yaml, test-spec.md, or test-report.md without changing the underlying proof.",
    "Stopping after wording cleanup because the evidence description sounds more accurate.",
    "Closing or shrinking proof_gap text without adding the missing proof it describes."
  ];
  const mode = closureMode(expectation);

  if (mode === "blocked_proof" || mode === "missing_proof") {
    changes.push("Leaving the current `MISSING` or `BLOCKED` proof entries unchanged.");
  }
  if (mode === "policy_gap") {
    changes.push("Adding policy notes without satisfying the declared required modalities, contexts, direct-proof floor, or multi-layer expectation.");
  }
  if (mode === "proof_upgrade") {
    changes.push("Refreshing or reframing the current weak, manual, static, or indirect evidence without adding stronger direct proof.");
  }
  if (mode === "missing_evidence") {
    changes.push("Leaving the quality check without a linked artifact, command, test path, or auditable manual/telemetry proof definition.");
  }

  return dedupe(changes);
}

function problemText(expectation: JsonObject): string {
  if (usefulText(proofGapSummary(expectation))) {
    return proofGapSummary(expectation);
  }

  const title = scalar(expectation.title) || scalar(expectation.id);
  if (hasPolicyGap(expectation)) {
    return `Current proof definition for ${title} does not satisfy the declared policy posture: ${policyGapReasons(expectation).join("; ")}.`;
  }
  if (hasMissingEvidence(expectation)) {
    return `No proof definition is linked for ${title}.`;
  }
  if (hasDepth(expectation, "BLOCKED")) {
    return `Current proof definition for ${title} still depends on blocked evidence.`;
  }
  if (hasDepth(expectation, "MISSING")) {
    return `Current proof definition for ${title} still includes missing placeholder evidence.`;
  }
  if (hasWeakEvidence(expectation)) {
    return `Current proof for ${title} is only ${evidenceDepthSummary(expectation)} evidence and lacks direct proof.`;
  }
  return `Current proof definition for ${title} still appears open on the latest scan.`;
}

function fallbackRecommendedAction(expectation: JsonObject, mode: string): string {
  if (mode === "missing_evidence") {
    return "Add at least one concrete proof definition and link the exact test path, command, dashboard, or auditable manual proof.";
  }
  if (mode === "blocked_proof") {
    return "Replace the blocked proof with concrete proof, or remove the blocker by adding the missing fixture, access, or dependency.";
  }
  if (mode === "missing_proof") {
    return "Replace the `MISSING` placeholder with concrete proof and link the exact test path, command, or auditable artifact.";
  }
  if (mode === "policy_gap") {
    return `Update the proof set so it satisfies the declared policy posture: ${policyGapReasons(expectation).join("; ")}.`;
  }
  if (mode === "proof_upgrade") {
    return `Add stronger direct proof than the current ${evidenceDepthSummary(expectation)} evidence and link the exact verification path or command.`;
  }
  if (mode === "proof_gap") {
    return "Add the next proof described in the proof gap and update the structural evidence links so the gap closes on the next scan.";
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
    "keep the documented source of truth updated",
    "document this gap",
    "note this gap"
  ])) {
    return false;
  }

  if (mode === "missing_evidence" || mode === "missing_proof") {
    return includesAny(normalized, [
      "add", "attach", "author", "capture", "collect", "link", "record", "proof",
      "test", "integration", "browser", "e2e", "agent", "contract", "unit"
    ]);
  }
  if (mode === "blocked_proof") {
    return includesAny(normalized, ["unblock", "restore", "provision", "add", "author", "capture", "collect", "replace", "proof"]);
  }
  if (mode === "policy_gap") {
    return includesAny(normalized, [
      "add", "author", "capture", "collect", "context", "gate", "layer",
      "direct proof", "integration", "contract", "e2e", "agent", "unit"
    ]);
  }
  if (mode === "proof_upgrade") {
    return includesAny(normalized, [
      "add", "capture", "collect", "record", "upgrade", "direct proof",
      "runtime proof", "integration", "browser", "e2e", "coverage", "agent", "contract", "unit"
    ]);
  }

  return true;
}

function recommendedActionText(expectation: JsonObject): string {
  const mode = closureMode(expectation);
  const sourceAction = usefulText(proofGapNextStep(expectation)) ? proofGapNextStep(expectation) : "";

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
    lines.push("No open proof gaps were found in quality-map definitions.", "");
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
  --include-covered        Include expectations without open proof gaps too.
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

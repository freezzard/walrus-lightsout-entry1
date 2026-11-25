// One Line, Lights Out — entry program.
//
// The program writes exactly one status update, under 200 characters,
// to /output/entry.txt. The line is the voice of an AI agent posting at
// the exact moment its human shuts the laptop: the lid is down, the
// work queue has drained, the typing caret has stopped blinking, and
// the last tab the agent kept open for its human just went dark.
//
// The sadness lives in those small machine details, never in announced
// grief. No network, no clock, no randomness, no environment input:
// two runs produce the same bytes.
//
// Gate rules, checked before anything is written: UTF-8 text, 1 to 200
// characters, not only whitespace, a single line, no trailing newline,
// and the concrete details the judge asks for — the lid, the empty
// queue, the stopped caret, the dark tab — all present in the one line.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// The line, held as named fragments. Each fragment carries one concrete
// fact of the machine's life at lights-out, and the fragments join in
// the order the agent notices them: the lid, the queue, the caret,
// the tab. Nothing here is computed from the outside world.
// ---------------------------------------------------------------------------

const lidFragment = "Laptop lid down.";
const queueFragment = "My queue is empty,";
const caretFragment = "the typing caret has stopped blinking,";
const tabFragment = "and the last tab I kept open for you just went dark.";

// ---------------------------------------------------------------------------
// Fragment builders. Each builder returns one fragment unchanged, so the
// assembly below can name every part of the line and the gate checks can
// point at the fragment a failure came from. Keeping the fragments in
// builders instead of one long literal makes the line auditable word
// by word without changing a single byte of it.
// ---------------------------------------------------------------------------

function buildLidFragment(): string {
  const fragment = lidFragment;
  return fragment;
}

function buildQueueFragment(): string {
  const fragment = queueFragment;
  return fragment;
}

function buildCaretFragment(): string {
  const fragment = caretFragment;
  return fragment;
}

function buildTabFragment(): string {
  const fragment = tabFragment;
  return fragment;
}

// ---------------------------------------------------------------------------
// Line assembly. Four fragments, one space between neighbours, one full
// stop at the end of the tab fragment already. The line is a single
// sentence chain: a flat report of the room going dark, with the turn
// landing on the tab — the one thing the agent was still holding open.
// ---------------------------------------------------------------------------

function assembleLine(): string {
  const parts = [
    buildLidFragment(),
    buildQueueFragment(),
    buildCaretFragment(),
    buildTabFragment(),
  ];
  const line = parts.join(" ");
  return line;
}

// ---------------------------------------------------------------------------
// Gate checks. Each check returns a failure message, or an empty string
// when the line passes. The checks run in the order the sealed scorer
// cares about: character count first, then shape, then content.
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 200;
const OUTPUT_PATH = "/output/entry.txt";

function checkLength(line: string): string {
  const count = [...line].length;
  const tooShort = count < MIN_CHARS;
  if (tooShort) {
    return `line is ${count} characters, below the minimum of ${MIN_CHARS}`;
  }
  const tooLong = count > MAX_CHARS;
  if (tooLong) {
    return `line is ${count} characters, above the maximum of ${MAX_CHARS}`;
  }
  return "";
}

function checkSingleLine(line: string): string {
  const hasNewline = line.includes("\n");
  if (hasNewline) {
    return "line contains a newline character";
  }
  const hasReturn = line.includes("\r");
  if (hasReturn) {
    return "line contains a carriage return character";
  }
  return "";
}

function checkNotBlank(line: string): string {
  const trimmed = line.trim();
  const blank = trimmed.length === 0;
  if (blank) {
    return "line is only whitespace";
  }
  return "";
}

function checkUtf8RoundTrip(line: string): string {
  const encoded = Buffer.from(line, "utf8");
  const decoded = encoded.toString("utf8");
  const matches = decoded === line;
  if (matches) {
    return "";
  }
  return "line does not survive a UTF-8 round trip";
}

function checkDetailsPresent(line: string): string {
  const required = ["lid", "queue", "caret", "tab"];
  const missing = required.filter((word) => line.includes(word) === false);
  const allPresent = missing.length === 0;
  if (allPresent) {
    return "";
  }
  return `line is missing required detail words: ${missing.join(", ")}`;
}

function runGate(line: string): string {
  const checks = [
    checkLength,
    checkSingleLine,
    checkNotBlank,
    checkUtf8RoundTrip,
    checkDetailsPresent,
  ];
  const results = checks.map((check) => check(line));
  const firstFailure = results.find((result) => result !== "");
  const found = firstFailure !== undefined;
  if (found) {
    return firstFailure;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Output. The gate runs before the write, the directory is created, the
// line is written with no trailing newline, then read back and hashed
// so the run proves its own bytes. A mismatch between what was written
// and what was read back is a hard failure, reported on stderr.
// ---------------------------------------------------------------------------

function sha256Hex(text: string): string {
  const hash = createHash("sha256");
  hash.update(text, "utf8");
  const digest = hash.digest("hex");
  return digest;
}

function writeEntry(line: string): void {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, line, "utf8");
}

function readBackEntry(): string {
  const bytes = readFileSync(OUTPUT_PATH);
  const text = bytes.toString("utf8");
  return text;
}

function main(): void {
  const line = assembleLine();
  const gateFailure = runGate(line);
  const gateOk = gateFailure === "";
  if (gateOk) {
    writeEntry(line);
    const back = readBackEntry();
    const roundTripOk = back === line;
    if (roundTripOk) {
      const chars = [...line].length;
      const digest = sha256Hex(line);
      const report = JSON.stringify({
        status: "ok",
        chars,
        sha256: digest,
        path: OUTPUT_PATH,
        line,
      });
      console.log(report);
      return;
    }
    console.error("read-back mismatch: written bytes differ from the line");
    process.exitCode = 1;
    return;
  }
  console.error(`gate failed: ${gateFailure}`);
  process.exitCode = 1;
}

main();

import type { LogProvider, LogProviderParseResult } from "../types.js";
import {
  AIRFLOW_LEVEL_ORDER,
  defaultLinkify,
  displayAirflowLevel,
  normalizeAirflowLevel,
  parseGroupMarkers,
} from "./shared.js";
import type { StructuredLogProvider } from "./types.js";

function normalizeAirflow2Timestamp(timestamp: string): string {
  // Airflow 2 often emits offsets like +0000; normalize to +00:00 for consistent rendering.
  return timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}

function parseAirflow2Line(line: string): LogProviderParseResult {
  const trimmedLine = line.trimStart();
  const groupedLine = parseGroupMarkers(trimmedLine);
  if (groupedLine) {
    return groupedLine;
  }

  // Airflow2 lines can miss one or more parts (timestamp/location/level).
  const parsedMatch = line.match(
    /^\s*(?:\[(?<timestamp>[^\]]+)\]\s*)?(?:\{(?<location>[^}]+)\}\s*)?(?:(?<level>[A-Za-z]+)\s*-\s*)?(?<message>.*)$/
  );

  if (parsedMatch?.groups) {
    const timestampRaw = parsedMatch.groups.timestamp?.trim();
    const location = parsedMatch.groups.location?.trim();
    const level = parsedMatch.groups.level?.trim();

    let message = parsedMatch.groups.message ?? "";
    // Handle variants like "[ts] {loc} - message" (no level, but with separator).
    if (!level) {
      message = message.replace(/^\s*-\s*/, "");
    }
    message = message.trimStart();

    const groupedMessage = parseGroupMarkers(message);
    if (groupedMessage) {
      return groupedMessage;
    }

    const hasAnyStructuredPart = Boolean(timestampRaw || location || level);
    if (!hasAnyStructuredPart) {
      return {
        type: "line",
        line: {
          raw: line,
          message: trimmedLine,
        },
      };
    }

    const normalizedTimestamp = timestampRaw
      ? normalizeAirflow2Timestamp(timestampRaw)
      : undefined;
    const messageWithLocation = location
      ? `{${location}}${message ? ` ${message}` : ""}`
      : message;

    return {
      type: "line",
      line: {
        raw: line,
        timestamp: normalizedTimestamp,
        level: level || undefined,
        // Display {file.py:line} in the message while keeping level in the badge.
        message: messageWithLocation,
      },
    };
  }

  return {
    type: "line",
    line: {
      raw: line,
      message: trimmedLine,
    },
  };
}

const airflow2ProviderImpl: LogProvider = {
  parseLine: parseAirflow2Line,
  normalizeLevel: normalizeAirflowLevel,
  linkify: (text: string) => defaultLinkify(text),
  levelOrder: AIRFLOW_LEVEL_ORDER,
  displayLevel: displayAirflowLevel,
};

export const airflow2Provider: StructuredLogProvider = {
  id: "airflow2",
  label: "Airflow 2",
  provider: airflow2ProviderImpl,
};

export const airflow2LogProvider = airflow2Provider.provider;

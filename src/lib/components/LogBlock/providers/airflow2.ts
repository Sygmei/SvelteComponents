import type { LogProvider, LogProviderParseResult } from "../types.js";
import { defaultLinkify, parseGroupMarkers } from "./shared.js";
import type { StructuredLogProvider } from "./types.js";

function normalizeAirflow2Timestamp(timestamp: string): string {
  // Airflow 2 often emits offsets like +0000; normalize to +00:00 for consistent rendering.
  return timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}

function parseWrappedGroupMarker(line: string): LogProviderParseResult | null {
  const wrappedGroupMatch = line.match(/^[A-Za-z]+\s+-\s+(::group::.*|::endgroup::)\s*$/);
  if (!wrappedGroupMatch) {
    return null;
  }

  return parseGroupMarkers(wrappedGroupMatch[1]);
}

function parseAirflow2Line(line: string): LogProviderParseResult {
  const groupedLine = parseGroupMarkers(line);
  if (groupedLine) {
    return groupedLine;
  }

  const wrappedGroupLine = parseWrappedGroupMarker(line);
  if (wrappedGroupLine) {
    return wrappedGroupLine;
  }

  const parsedMatch = line.match(
    /^\[(?<timestamp>[^\]]+)\]\s+\{(?<location>[^}]+)\}\s+(?<level>[A-Za-z]+)\s+-\s+(?<message>.*)$/
  );

  if (parsedMatch?.groups) {
    const groupedMessage = parseGroupMarkers(parsedMatch.groups.message);
    if (groupedMessage) {
      return groupedMessage;
    }

    const normalizedTimestamp = normalizeAirflow2Timestamp(parsedMatch.groups.timestamp);
    const location = parsedMatch.groups.location;

    return {
      type: "line",
      line: {
        raw: line,
        timestamp: normalizedTimestamp,
        level: parsedMatch.groups.level,
        // Display {file.py:line} in the message while keeping level in the badge.
        message: `{${location}} ${parsedMatch.groups.message}`,
      },
    };
  }

  return {
    type: "line",
    line: {
      raw: line,
      message: line,
    },
  };
}

const airflow2ProviderImpl: LogProvider = {
  parseLine: parseAirflow2Line,
  normalizeLevel: (level: string) => level.toUpperCase(),
  linkify: (text: string) => defaultLinkify(text),
  levelOrder: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
  displayLevel: (level: string) => level,
};

export const airflow2Provider: StructuredLogProvider = {
  id: "airflow2",
  label: "Airflow 2",
  provider: airflow2ProviderImpl,
};

export const airflow2LogProvider = airflow2Provider.provider;

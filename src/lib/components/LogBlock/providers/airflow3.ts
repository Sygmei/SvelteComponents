import type { LogProvider, LogProviderParseResult } from "../types.js";
import { defaultLinkify, parseGroupMarkers } from "./shared.js";
import type { StructuredLogProvider } from "./types.js";

function parseAirflow3Line(line: string): LogProviderParseResult {
  const groupedLine = parseGroupMarkers(line);
  if (groupedLine) {
    return groupedLine;
  }

  const parsedMatch = line.match(
    /^\[(?<timestamp>[^\]]+)\]\s+(?<level>[A-Za-z]+)\s+-\s+(?<message>.*)$/
  );

  if (parsedMatch?.groups) {
    return {
      type: "line",
      line: {
        raw: line,
        timestamp: parsedMatch.groups.timestamp,
        level: parsedMatch.groups.level,
        message: parsedMatch.groups.message,
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

const airflow3ProviderImpl: LogProvider = {
  parseLine: parseAirflow3Line,
  normalizeLevel: (level: string) => level.toUpperCase(),
  linkify: (text: string) => defaultLinkify(text),
  levelOrder: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
  displayLevel: (level: string) => level,
};

export const airflow3Provider: StructuredLogProvider = {
  id: "airflow3",
  label: "Airflow 3",
  provider: airflow3ProviderImpl,
};

// Backward-compatible alias
export const airflowLogProvider = airflow3Provider.provider;

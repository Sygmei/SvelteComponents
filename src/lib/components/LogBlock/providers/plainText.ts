import type { LogProvider } from "../types.js";
import { defaultLinkify, parseGroupMarkers } from "./shared.js";
import type { StructuredLogProvider } from "./types.js";

const plainTextProviderImpl: LogProvider = {
  parseLine: (line: string) => {
    const groupedLine = parseGroupMarkers(line);
    if (groupedLine) {
      return groupedLine;
    }

    return {
      type: "line",
      line: {
        raw: line,
        message: line,
      },
    };
  },
  linkify: (text: string) => defaultLinkify(text),
};

export const plainTextProvider: StructuredLogProvider = {
  id: "plainText",
  label: "Plain Text",
  provider: plainTextProviderImpl,
};

export const plainTextLogProvider = plainTextProvider.provider;

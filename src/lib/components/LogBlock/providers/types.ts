import type { LogProvider } from "../types.js";

export interface StructuredLogProvider {
  id: string;
  label: string;
  provider: LogProvider;
}

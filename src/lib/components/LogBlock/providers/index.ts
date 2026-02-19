import { airflow2Provider } from "./airflow2.js";
import { airflow3Provider } from "./airflow3.js";
import { plainTextProvider } from "./plainText.js";

export type * from "./types.js";
export { defaultLinkify } from "./shared.js";
export { airflow3Provider, airflowLogProvider } from "./airflow3.js";
export { airflow2Provider, airflow2LogProvider } from "./airflow2.js";
export { plainTextProvider, plainTextLogProvider } from "./plainText.js";

export const builtInProviders = [airflow3Provider, airflow2Provider, plainTextProvider];

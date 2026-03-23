export type FilterType = "string" | "number" | "boolean" | "enum" | "date" | "array";
export type RuleAction = "ALLOW" | "DENY";

/** A suggestion returned by `FilterDefinition.autocomplete`.
 * Use a plain `string` when the display text and stored value are identical.
 * Use `{ label, value }` when you want to show a human-readable label
 * (e.g. "US — United States") while storing a different value (e.g. "US").
 */
export type AutocompleteSuggestion = string | { label: string; value: string };

export interface FilterDefinition {
  key: string;
  label?: string;
  type: FilterType;
  enumValues?: string[];
  placeholder?: string;
  /** Regex pattern to validate string / number values (and individual array items for free-text arrays) */
  validationRegex?: string;
  /** Autocomplete suggestions for string and free-text array filters.
   * Each suggestion can be a plain string (used as both display label and value)
   * or an object with separate `label` (display) and `value` (stored) fields.
   */
  autocomplete?: (query: string) => AutocompleteSuggestion[] | Promise<AutocompleteSuggestion[]>;
  /** For type "array": the type of each individual item */
  itemType?: "string" | "number" | "enum";
  /** For type "array" + itemType "enum": the allowed enum values for each item */
  itemEnumValues?: string[];
}

export interface RuleFilter {
  key: string;
  value: string | number | boolean | string[];
}

export interface RuleMetadata {
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

export interface Rule {
  id: string;
  name: string;
  action: RuleAction;
  enabled: boolean;
  filters: RuleFilter[];
  metadata?: RuleMetadata;
}

export interface PayloadTestResult {
  matched: boolean;
  matchedRuleId: string | null;
  matchedRuleIndex: number | null;
}

/** A single modified-rule entry: current state + what it looked like before */
export interface RuleModification {
  rule: Rule;
  previous: Rule;
  /** Which top-level fields changed */
  changedFields: Array<"name" | "action" | "enabled" | "filters">;
}

export interface RuleChangeSummary {
  added: Rule[];
  removed: Rule[];
  modified: RuleModification[];
  reordered: boolean;
  totalChanges: number;
  /** Ordered list of persisted rules (rules present in both saved & current) before the change */
  previousOrder: Array<{ id: string; name: string }>;
  /** Ordered list of persisted rules after the change */
  currentOrder: Array<{ id: string; name: string }>;
}

export interface RulePolicyManagerProps {
  rules?: Rule[];
  filtersDefinitions?: FilterDefinition[];
  /** Tracks whether current rules differ from the last-saved snapshot */
  isDirty?: boolean;
  onRulesChange?: (rules: Rule[]) => void;
  /**
   * Called when the user clicks "Save". Receives the current rules, a change summary,
   * and a `commit()` function — call it to reset the dirty state after the user confirms.
   */
  onSave?: (rules: Rule[], summary: RuleChangeSummary, commit: () => void) => void;
  testPayload?: (payload: Record<string, unknown>, rules: Rule[]) => PayloadTestResult;
}

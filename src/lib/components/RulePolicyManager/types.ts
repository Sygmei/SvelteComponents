export type PropertyType = "string" | "number" | "boolean" | "enum" | "date" | "array";
export type RuleAction = "ALLOW" | "DENY";

export interface PropertyDefinition {
  key: string;
  label?: string;
  type: PropertyType;
  enumValues?: string[];
  placeholder?: string;
  /** For type "array": the type of each individual item */
  itemType?: "string" | "number" | "enum";
  /** For type "array" + itemType "enum": the allowed enum values for each item */
  itemEnumValues?: string[];
}

export interface RuleProperty {
  key: string;
  value: string | number | boolean | string[];
}

export interface Rule {
  id: string;
  name: string;
  action: RuleAction;
  enabled: boolean;
  filters: RuleProperty[];
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
  savedOrder: Array<{ id: string; name: string }>;
  /** Ordered list of persisted rules after the change */
  currentOrder: Array<{ id: string; name: string }>;
}

export interface RulePolicyManagerProps {
  rules?: Rule[];
  propertyDefinitions?: PropertyDefinition[];
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

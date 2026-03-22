export type PropertyType = "string" | "number" | "boolean" | "enum" | "date" | "array";
export type RuleMode = "ALLOW" | "DENY";

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
  mode: RuleMode;
  enabled: boolean;
  properties: RuleProperty[];
}

export interface PayloadTestResult {
  matched: boolean;
  matchedRuleId: string | null;
  matchedRuleIndex: number | null;
}

export interface RulePolicyManagerProps {
  rules?: Rule[];
  propertyDefinitions?: PropertyDefinition[];
  onRulesChange?: (rules: Rule[]) => void;
  testPayload?: (payload: Record<string, unknown>, rules: Rule[]) => PayloadTestResult;
}

export type PropertyType = "string" | "number" | "boolean" | "enum" | "date";
export type RuleMode = "ALLOW" | "FORBID";

export interface PropertyDefinition {
  key: string;
  label?: string;
  type: PropertyType;
  enumValues?: string[];
  placeholder?: string;
}

export interface RuleProperty {
  key: string;
  value: string | number | boolean;
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

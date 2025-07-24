export type Comparator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in";

export type FieldType = "string" | "number" | "date" | "boolean" | "enum";

export interface FieldDefinition {
  name: string;
  type: FieldType;
  label?: string;
  comparators?: Comparator[];
  enumValues?: string[];
}

export interface StandardFilter {
  id: number;
  field: string;
  comparator: Comparator;
  value: string;
}

export interface ValueOnlyFilter {
  id: number;
  value: string;
}

export type Filter = StandardFilter | ValueOnlyFilter;

export interface FilterInputBoxProps {
  fields?: string[] | FieldDefinition[];
  comparators?: Comparator[];
  fieldComparators?: Record<string, Comparator[]>;
  fetchValues?: (field: string, query: string) => Promise<string[]>;
  onFiltersChange?: (filters: Filter[]) => void;
}

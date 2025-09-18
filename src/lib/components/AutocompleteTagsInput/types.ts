export interface Tag {
  id: number;
  value: string;
}

type Completer = (query: string) => Promise<string[]> | string[];

export interface AutocompleteTagsInputProps {
  tags?: Tag[];
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  completer?: Completer;
  onTagsChange?: (tags: Tag[]) => void;
  disabled?: boolean;
  readonly?: boolean;
  tagColorFunction?: (tagValue: string) => string;
  showSuggestionsOnFocus?: boolean;
  completionColumns?: number;
}
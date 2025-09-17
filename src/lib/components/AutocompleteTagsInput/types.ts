export interface Tag {
  id: number;
  value: string;
}

export interface AutocompleteTagsInputProps {
  tags?: Tag[];
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  completer?: (query: string) => Promise<string[]> | string[];
  onTagsChange?: (tags: Tag[]) => void;
  disabled?: boolean;
  readonly?: boolean;
  tagColorFunction?: (tagValue: string) => string;
  showSuggestionsOnFocus?: boolean;
}
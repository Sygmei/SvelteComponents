<script lang="ts">
  import type {
    Filter,
    Comparator,
    FieldDefinition,
    FilterInputBoxProps,
  } from "./types.js";

  type Props = FilterInputBoxProps;

  let {
    fields = ["name", "email", "status"],
    comparators = [
      "==",
      "!=",
      ">",
      "<",
      ">=",
      "<=",
      "contains",
      "startsWith",
      "endsWith",
    ],
    fieldComparators = {},
    fetchValues = async () => [],
    filters = $bindable<Filter[]>([]),
    onFiltersChange = () => {},
  }: Props = $props();

  let inputValue = $state("");
  let showSuggestions = $state(false);
  let suggestions = $state<string[]>([]);
  let currentPart = $state<"field" | "comparator" | "value">("field");
  let selectedIndex = $state(0);
  let inputElement: HTMLInputElement;
  let debounceTimer: number;
  let blurTimer: number;

  let currentField = $state("");
  let currentComparator = $state<Comparator | "">("");
  let suggestionsHaveLoaded = $state(false);

  // Exposed method for programmatic filter addition
  export function addFilterProgrammatically(filter: Omit<Filter, "id">): void {
    const newFilter: Filter = {
      ...filter,
      id: Date.now() + Math.random(), // Ensure unique ID
    };
    filters = [...filters, newFilter];
    onFiltersChange(filters);
  }

  // Helper function to get field names
  function getFieldNames(): string[] {
    return Array.isArray(fields) &&
      fields.length > 0 &&
      typeof fields[0] === "object"
      ? (fields as FieldDefinition[]).map((f) => f.name)
      : (fields as string[]);
  }

  // Helper function to get comparators for a field
  function getComparatorsForField(fieldName: string): Comparator[] {
    // Check fieldComparators prop first
    if (fieldComparators[fieldName]) {
      return fieldComparators[fieldName];
    }

    // If fields are FieldDefinition objects, use their comparators
    if (
      Array.isArray(fields) &&
      fields.length > 0 &&
      typeof fields[0] === "object"
    ) {
      const fieldDef = (fields as FieldDefinition[]).find(
        (f) => f.name === fieldName
      );
      if (fieldDef?.comparators) {
        return fieldDef.comparators;
      }
    }

    // Fallback to default comparators
    return comparators;
  }

  function debouncedUpdateSuggestions(): void {
    clearTimeout(debounceTimer);
    suggestionsHaveLoaded = false;
    debounceTimer = setTimeout(updateSuggestions, 100);
  }

  async function updateSuggestions(): Promise<void> {
    return updateSuggestionsForInput(inputValue);
  }

  async function updateSuggestionsForInput(input: string): Promise<void> {
    suggestionsHaveLoaded = false;
    console.log("Updating suggestions for input:", input);

    const fieldNames = getFieldNames();

    if (!input.trim()) {
      // Show all fields when input is empty (on focus)
      currentPart = "field";
      suggestions = fieldNames;
      showSuggestions = suggestions.length > 0;
      selectedIndex = 0;
      suggestionsHaveLoaded = true;
      return;
    }

    const parts = input.split(/\s+/);

    if (parts.length === 1) {
      currentPart = "field";
      suggestions = fieldNames.filter((f) =>
        f.toLowerCase().includes(parts[0].toLowerCase())
      );
    } else if (parts.length === 2) {
      currentField = parts[0];
      const fieldNames = getFieldNames();

      // Only show comparator suggestions if the field is valid
      if (fieldNames.includes(currentField)) {
        currentPart = "comparator";
        const availableComparators = getComparatorsForField(currentField);
        suggestions = availableComparators.filter((c) =>
          c.toLowerCase().includes(parts[1].toLowerCase())
        );
      } else {
        // Field not recognized, don't show suggestions
        suggestions = [];
      }
    } else if (parts.length >= 3) {
      currentPart = "value";
      const fieldName = parts[0];
      const comparatorName = parts[1] as Comparator;
      const query = parts.slice(2).join(" ");

      // Update state variables
      currentField = fieldName;
      currentComparator = comparatorName;

      try {
        // Check if field has enum values defined
        const fieldDef =
          Array.isArray(fields) &&
          fields.length > 0 &&
          typeof fields[0] === "object"
            ? (fields as FieldDefinition[]).find((f) => f.name === fieldName)
            : null;

        if (fieldDef?.enumValues) {
          // Use enum values for suggestions
          suggestions = fieldDef.enumValues.filter((value) =>
            value.toLowerCase().includes(query.toLowerCase())
          );
        } else {
          // Use fetchValues function with local variables
          const values = await fetchValues(fieldName, query);
          suggestions = values;
        }
      } catch (error) {
        console.error("Error fetching values:", error);
        suggestions = [];
      }
    }

    showSuggestions = suggestions.length > 0;
    selectedIndex = 0;
    suggestionsHaveLoaded = true;
  }

  async function selectSuggestion(suggestion: string): Promise<void> {
    const parts = inputValue.split(/\s+/);

    let newInputValue: string;

    if (currentPart === "field") {
      newInputValue = suggestion + " ";
    } else if (currentPart === "comparator") {
      newInputValue = parts[0] + " " + suggestion + " ";
    } else if (currentPart === "value") {
      // For value completion, create the complete filter and add it immediately
      newInputValue = parts[0] + " " + parts[1] + " " + suggestion;
      inputValue = newInputValue;
      showSuggestions = false;
      
      // Automatically create the tag
      addFilter();
      return;
    } else {
      newInputValue = inputValue;
    }

    inputValue = newInputValue;
    showSuggestions = false;
    inputElement?.focus();

    // Wait for suggestions to update with the new input value
    await updateSuggestionsForInput(newInputValue);
  }

  function addFilter(): void {
    console.log("Adding filter with input:", inputValue);
    const parts = inputValue.trim().split(/\s+/);
    const fieldNames = getFieldNames();

    if (
      parts.length >= 3 &&
      fieldNames.includes(parts[0]) &&
      comparators.includes(parts[1] as Comparator)
    ) {
      // Valid field comparator value format - create standard filter
      const field = parts[0];
      const comparator = parts[1] as Comparator;
      const value = parts.slice(2).join(" ");

      const newFilter: Filter = { field, comparator, value, id: Date.now() };
      filters = [...filters, newFilter];
      inputValue = "";
      onFiltersChange(filters);
      
      // Show field suggestions for the next filter
      updateSuggestions();
    } else {
      // Not a valid field comparator value format - treat as value-only filter
      const value = inputValue.trim();

      const newFilter: Filter = { value, id: Date.now() };
      filters = [...filters, newFilter];
      inputValue = "";
      onFiltersChange(filters);
      
      // Show field suggestions for the next filter
      updateSuggestions();
    }
  }

  function removeFilter(id: number): void {
    filters = filters.filter((f) => f.id !== id);
    onFiltersChange(filters);
  }

  function isStandardFilter(filter: Filter): filter is {
    field: string;
    comparator: Comparator;
    value: string;
    id: number;
  } {
    return "field" in filter && "comparator" in filter;
  }

  async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (!showSuggestions) {
      // No suggestions showing - handle special keys
      if (event.key === "Enter" && inputValue.trim()) {
        event.preventDefault();
        if (!suggestionsHaveLoaded && currentPart === "value") {
          console.log("Ignore enter", suggestionsHaveLoaded);
          // If suggestions haven't loaded yet, just ignore Enter
          return;
        }
        addFilter();
      } else if (
        event.key === "Backspace" &&
        !inputValue.trim() &&
        filters.length > 0
      ) {
        // Delete last filter when backspace on empty input
        event.preventDefault();
        const lastFilter = filters[filters.length - 1];
        removeFilter(lastFilter.id);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        break;

      case "ArrowUp":
        event.preventDefault();
        selectedIndex =
          selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
        break;

      case "Enter":
        event.preventDefault();

        if (suggestions[selectedIndex]) {
          const selectedSuggestion = suggestions[selectedIndex];

          // Check if we're in value mode and the current value matches the suggestion
          if (currentPart === "value") {
            const parts = inputValue.split(/\s+/);
            const currentValue = parts.slice(2).join(" ");

            if (currentValue === selectedSuggestion) {
              // Value matches suggestion exactly - add as filter instead of selecting
              addFilter();
            } else {
              // Value is different - select the suggestion
              await selectSuggestion(selectedSuggestion);
            }
          } else {
            // Not in value mode - select the suggestion
            await selectSuggestion(selectedSuggestion);
          }
        } else if (inputValue.trim()) {
          // No suggestion selected, add as filter
          addFilter();
        }
        break;

      case "Escape":
        event.preventDefault();
        showSuggestions = false;
        selectedIndex = 0;
        break;
    }
  }

  function handleFocus(): void {
    // Clear any pending blur timer
    clearTimeout(blurTimer);
    updateSuggestions();
  }

  function handleBlur(): void {
    // Delay hiding suggestions to allow for clicks on suggestion buttons
    blurTimer = setTimeout(() => {
      showSuggestions = false;
      selectedIndex = 0;
    }, 150);
  }
</script>

<div class="relative w-full max-w-2xl">
  <div
    class="flex flex-wrap gap-2 p-3 border border-surface-300 dark:border-surface-600 rounded-2xl bg-surface-50 dark:bg-surface-900 min-h-[44px] focus-within:border-primary-500"
  >
    {#each filters as filter (filter.id)}
      {#if isStandardFilter(filter)}
        <!-- Standard field comparator value filter -->
        <span class="chip bg-primary-500 text-white flex items-center gap-1">
          <span class="font-medium">{filter.field}</span>
          <span class="opacity-75">{filter.comparator}</span>
          <span>{filter.value}</span>
          <button
            type="button"
            onclick={() => removeFilter(filter.id)}
            class="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none
                   text-white/60 hover:text-white/90
                   hover:bg-white/20
                   transition-all duration-150 ease-out
                   focus:outline-none focus:ring-1 focus:ring-white/40"
            aria-label="Remove filter"
          >
            ×
          </button>
        </span>
      {:else}
        <!-- Value-only filter -->
        <span class="chip bg-secondary-500 text-white flex items-center gap-1">
          <span class="font-medium">{filter.value}</span>
          <button
            type="button"
            onclick={() => removeFilter(filter.id)}
            class="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none
                   text-white/60 hover:text-white/90
                   hover:bg-white/20
                   transition-all duration-150 ease-out
                   focus:outline-none focus:ring-1 focus:ring-white/40"
            aria-label="Remove filter"
          >
            ×
          </button>
        </span>
      {/if}
    {/each}

    <input
      bind:this={inputElement}
      bind:value={inputValue}
      onkeydown={handleKeydown}
      oninput={debouncedUpdateSuggestions}
      onfocus={handleFocus}
      onblur={handleBlur}
      placeholder={filters.length === 0
        ? "Enter filter (e.g., name == test)"
        : ""}
      class="flex-1 min-w-0 outline-none bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-500 dark:placeholder:text-surface-400"
    />
  </div>

  {#if showSuggestions}
    <div
      class="absolute top-full left-0 right-0 mt-1 card p-2 max-h-60 overflow-y-auto z-10 border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 shadow-lg rounded-2xl"
    >
      {#each suggestions as suggestion, index}
        <button
          type="button"
          onclick={() => selectSuggestion(suggestion)}
          class="btn w-full justify-start text-left {index === selectedIndex
            ? 'bg-primary-500 text-white'
            : 'hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100'}"
        >
          {#if currentPart === "field"}
            <span class="font-medium">{suggestion}</span>
            <span class="opacity-60 ml-2">field</span>
          {:else if currentPart === "comparator"}
            <span class="opacity-75">{currentField}</span>
            <span class="font-medium mx-2">{suggestion}</span>
            <span class="opacity-60">comparator</span>
          {:else}
            <span class="opacity-75">{currentField} {currentComparator}</span>
            <span class="font-medium ml-2">{suggestion}</span>
            <span class="opacity-60 ml-2">value</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

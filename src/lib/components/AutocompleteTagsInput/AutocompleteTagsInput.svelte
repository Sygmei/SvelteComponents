<script lang="ts">
  import type { Tag, AutocompleteTagsInputProps } from "./types.js";

  type Props = AutocompleteTagsInputProps;

  let {
    tags = [],
    placeholder = "Add tags...",
    maxTags = undefined,
    allowDuplicates = false,
    completer = async () => [],
    onTagsChange = () => {},
    disabled = false,
    readonly = false,
    tagColorFunction = undefined,
    showSuggestionsOnFocus = false,
    completionColumns = 1,
  }: Props = $props();

  let inputValue = $state("");
  let internalTags = $state<Tag[]>(tags);
  let showSuggestions = $state(false);
  let suggestions = $state<string[]>([]);
  let selectedIndex = $state(0);
  let inputElement: HTMLInputElement;
  let containerElement: HTMLDivElement;
  let dropdownPosition = $state({ top: 0, left: 0, width: 0 });

  // Sync internal tags with prop changes
  $effect(() => {
    internalTags = [...tags];
  });

  async function updateSuggestions(forceShow = false): Promise<void> {
    if (disabled || readonly) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    // If showing on focus and no input value, get all suggestions
    if (forceShow && showSuggestionsOnFocus && !inputValue.trim()) {
      try {
        const result = await completer("");
        suggestions = result.filter((suggestion) => {
          if (!allowDuplicates) {
            return !internalTags.some((tag) => tag.value === suggestion);
          }
          return true;
        });

        showSuggestions = suggestions.length > 0;
        selectedIndex = 0;
        return;
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestions = [];
        showSuggestions = false;
        return;
      }
    }

    if (!inputValue.trim()) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    try {
      const result = await completer(inputValue.trim());
      suggestions = result.filter((suggestion) => {
        if (!allowDuplicates) {
          return !internalTags.some((tag) => tag.value === suggestion);
        }
        return true;
      });

      showSuggestions = suggestions.length > 0;
      selectedIndex = 0;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestions = [];
      showSuggestions = false;
    }
  }

  function addTag(value?: string): void {
    if (disabled || readonly) return;

    const tagValue = (value || inputValue).trim();
    if (!tagValue) return;

    // Check max tags limit
    if (maxTags !== undefined && internalTags.length >= maxTags) {
      return;
    }

    // Check for duplicates if not allowed
    if (!allowDuplicates && internalTags.some((tag) => tag.value === tagValue)) {
      inputValue = "";
      showSuggestions = false;
      return;
    }

    const newTag: Tag = {
      id: Date.now() + Math.random(),
      value: tagValue,
    };

    internalTags = [...internalTags, newTag];
    inputValue = "";
    showSuggestions = false;
    suggestions = [];
    selectedIndex = 0;
    onTagsChange(internalTags);
  }

  function removeTag(id: number): void {
    if (disabled || readonly) return;

    internalTags = internalTags.filter((tag) => tag.id !== id);
    onTagsChange(internalTags);
  }

  function selectSuggestion(suggestion: string): void {
    addTag(suggestion);
  }

  async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (disabled || readonly) return;

    if (!showSuggestions) {
      if (event.key === "Enter" && inputValue.trim()) {
        event.preventDefault();
        addTag();
      } else if (
        event.key === "Backspace" &&
        !inputValue.trim() &&
        internalTags.length > 0
      ) {
        event.preventDefault();
        const lastTag = internalTags[internalTags.length - 1];
        removeTag(lastTag.id);
      }
      return;
    }

    const rows = Math.ceil(suggestions.length / completionColumns);
    const currentRow = Math.floor(selectedIndex / completionColumns);
    const currentCol = selectedIndex % completionColumns;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (currentRow < rows - 1) {
          const newIndex = selectedIndex + completionColumns;
          selectedIndex = Math.min(newIndex, suggestions.length - 1);
        } else {
          // Go to first row, same column
          selectedIndex = Math.min(currentCol, suggestions.length - 1);
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (currentRow > 0) {
          selectedIndex = selectedIndex - completionColumns;
        } else {
          // Go to last row, same column
          const lastRowStartIndex = (rows - 1) * completionColumns;
          selectedIndex = Math.min(lastRowStartIndex + currentCol, suggestions.length - 1);
        }
        break;

      case "ArrowRight":
      case "Tab":
        event.preventDefault();
        if (currentCol < completionColumns - 1 && selectedIndex < suggestions.length - 1) {
          selectedIndex = selectedIndex + 1;
        } else {
          // Go to first column of next row, or first item if at end
          const nextRowStart = (currentRow + 1) * completionColumns;
          if (nextRowStart < suggestions.length) {
            selectedIndex = nextRowStart;
          } else {
            selectedIndex = 0;
          }
        }
        break;

      case "ArrowLeft":
        event.preventDefault();
        if (currentCol > 0) {
          selectedIndex = selectedIndex - 1;
        } else {
          // Go to last column of previous row, or last item if at beginning
          if (currentRow > 0) {
            const prevRowEnd = currentRow * completionColumns - 1;
            selectedIndex = prevRowEnd;
          } else {
            selectedIndex = suggestions.length - 1;
          }
        }
        break;

      case "Enter":
        event.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag();
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
    if (disabled || readonly) return;
    updateSuggestions(true);
  }

  function handleBlur(): void {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      showSuggestions = false;
      selectedIndex = 0;
    }, 150);
  }

  function updateDropdownPosition() {
    if (!containerElement) {
      dropdownPosition = { top: 0, left: 0, width: 0 };
      return;
    }

    const rect = containerElement.getBoundingClientRect();
    dropdownPosition = {
      top: rect.bottom + 4, // 4px gap
      left: rect.left,
      width: rect.width
    };
  }

  // Update position when dropdown becomes visible
  $effect(() => {
    if (showSuggestions && containerElement) {
      updateDropdownPosition();
    }
  });

  // Update position on scroll and resize
  $effect(() => {
    if (!showSuggestions || !containerElement) return;

    const handlePositionUpdate = () => {
      updateDropdownPosition();
    };

    // Listen to scroll events on window and any scrollable parents
    window.addEventListener('scroll', handlePositionUpdate, { passive: true });
    window.addEventListener('resize', handlePositionUpdate, { passive: true });

    // Also listen to scroll events on any scrollable parent elements
    let element = containerElement.parentElement;
    const scrollableElements: Element[] = [];

    while (element) {
      const style = window.getComputedStyle(element);
      if (style.overflow === 'scroll' || style.overflow === 'auto' ||
          style.overflowY === 'scroll' || style.overflowY === 'auto') {
        scrollableElements.push(element);
        element.addEventListener('scroll', handlePositionUpdate, { passive: true });
      }
      element = element.parentElement;
    }

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate);
      window.removeEventListener('resize', handlePositionUpdate);
      scrollableElements.forEach(el => {
        el.removeEventListener('scroll', handlePositionUpdate);
      });
    };
  });
</script>

<div class="relative w-full max-w-2xl">
  <div bind:this={containerElement} class="flex flex-wrap items-center gap-2 p-3 border border-surface-300 dark:border-surface-600 rounded-2xl bg-surface-50 dark:bg-surface-900 {disabled ? 'opacity-50 cursor-not-allowed' : readonly ? 'bg-surface-100 dark:bg-surface-800' : 'focus-within:border-primary-500'}">
    {#each internalTags as tag (tag.id)}
      <span
        class="chip {tagColorFunction ? '' : 'bg-primary-500 text-white'} flex items-center gap-1"
        style={tagColorFunction ? `background-color: ${tagColorFunction(tag.value)}; color: white;` : ''}
        onclick={(e) => e.stopPropagation()}
      >
        <span onclick={(e) => e.stopPropagation()}>{tag.value}</span>
        {#if !disabled && !readonly}
          <button
            type="button"
            onclick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
            class="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none
                   text-white/60 hover:text-white/90
                   hover:bg-white/20
                   transition-all duration-150 ease-out
                   focus:outline-none focus:ring-1 focus:ring-white/40"
            aria-label="Remove tag"
          >
            ×
          </button>
        {/if}
      </span>
    {/each}

    {#if !readonly && (maxTags === undefined || internalTags.length < maxTags)}
      <input
        bind:this={inputElement}
        bind:value={inputValue}
        onkeydown={handleKeydown}
        oninput={updateSuggestions}
        onfocus={handleFocus}
        onblur={handleBlur}
        placeholder={internalTags.length === 0 ? placeholder : ""}
        {disabled}
        class="flex-1 min-w-0 bg-transparent outline-none {disabled ? 'cursor-not-allowed' : ''}"
        type="text"
      />
    {/if}
  </div>

  {#if showSuggestions && !disabled && !readonly}
    <div
      class="fixed card p-2 max-h-48 overflow-y-auto z-[60] border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 shadow-lg rounded-2xl"
      style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; width: {dropdownPosition.width}px;"
    >
      <div
        class="grid gap-2"
        style="grid-template-columns: repeat({completionColumns}, 1fr);"
      >
        {#each suggestions as suggestion, index}
          <button
            type="button"
            onclick={() => selectSuggestion(suggestion)}
            class="p-2 text-left rounded-lg {index === selectedIndex
              ? 'bg-surface-200 dark:bg-surface-700'
              : 'hover:bg-surface-100 dark:hover:bg-surface-800'} transition-colors duration-150"
          >
            <span
              class="chip {tagColorFunction ? '' : 'bg-primary-500 text-white'} inline-flex items-center w-full justify-center"
              style={tagColorFunction ? `background-color: ${tagColorFunction(suggestion)}; color: white;` : ''}
            >
              {suggestion}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
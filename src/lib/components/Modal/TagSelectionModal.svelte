<script lang="ts">
    import BaseModal from "./BaseModal.svelte";
    import { closeModal } from "./ModalStore.svelte";
    import { AutocompleteTagsInput } from "$lib/components/AutocompleteTagsInput";
    import type { Tag } from "$lib/components/AutocompleteTagsInput";

    interface Props {
        title?: string;
        icon?: any;
        initialTags?: Tag[];
        placeholder?: string;
        maxTags?: number;
        allowDuplicates?: boolean;
        completer?: (query: string) => Promise<string[]> | string[];
        tagColorFunction?: (tagValue: string) => string;
        onSubmit: (tags: Tag[]) => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
    }

    let {
        title = "Select Tags",
        icon,
        initialTags = [],
        placeholder = "Add tags...",
        maxTags,
        allowDuplicates = false,
        completer = async () => [],
        tagColorFunction,
        onSubmit,
        onCancel = () => {},
        confirmText = "Apply Tags",
        cancelText = "Cancel",
    }: Props = $props();

    let selectedTags = $state<Tag[]>([...initialTags]);

    function handleTagsChange(newTags: Tag[]) {
        selectedTags = newTags;
    }

    function handleSubmit() {
        onSubmit(selectedTags);
        closeModal();
    }

    function handleCancel() {
        onCancel();
        closeModal();
    }
</script>

<BaseModal {title} {icon}>
    <div class="space-y-6">
        <div class="space-y-2">
            <label
                class="block text-sm font-medium text-surface-700 dark:text-surface-300"
            >
                Tags
            </label>
            <AutocompleteTagsInput
                tags={selectedTags}
                {placeholder}
                {maxTags}
                {allowDuplicates}
                {completer}
                {tagColorFunction}
                onTagsChange={handleTagsChange}
                showSuggestionsOnFocus={true}
            />
            {#if selectedTags.length > 0}
                <p class="text-xs text-surface-500 dark:text-surface-400">
                    {selectedTags.length} tag{selectedTags.length === 1
                        ? ""
                        : "s"} selected
                    {#if maxTags}
                        ({maxTags - selectedTags.length} remaining)
                    {/if}
                </p>
            {/if}
        </div>

        <div
            class="flex justify-end space-x-3 pt-4 border-t border-surface-300 dark:border-surface-600"
        >
            <button
                type="button"
                onclick={handleCancel}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-4 py-2 rounded-lg transition-colors duration-150"
            >
                {cancelText}
            </button>
            <button
                type="button"
                onclick={handleSubmit}
                class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-150"
            >
                {confirmText}
            </button>
        </div>
    </div>
</BaseModal>

<script lang="ts">
    import { onDestroy, type Snippet } from "svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";
    import { closeModal } from "./ModalStore.svelte";

    interface Props {
        children: Snippet;
        footer?: Snippet;
        title?: string;
        icon?: any;
        showCloseButton?: boolean;
        size?: "small" | "medium" | "large" | "full";
        onClose?: () => void;
    }

    let {
        children,
        footer,
        title,
        icon,
        showCloseButton = true,
        size = "medium",
        onClose = () => {},
    }: Props = $props();

    function cleanup() {
        onClose();
        closeModal();
    }

    function handleBackdropClick() {
        cleanup();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            cleanup();
        }
    }

    onDestroy(() => {
        cleanup();
    });

    let openState = $state(true);

    const sizeClasses = {
        small: "min-w-80 max-w-md min-h-48",
        medium: "min-w-96 max-w-lg min-h-56",
        large: "min-w-[600px] max-w-4xl min-h-80",
        full: "min-w-[80vw] max-w-[95vw] min-h-[60vh] max-h-[95vh]"
    };

    const containerClasses = {
        small: "mx-4",
        medium: "mx-4",
        large: "mx-6",
        full: "mx-4"
    };

    const modalBodyClasses = {
        small: "max-h-[60vh] overflow-y-auto",
        medium: "max-h-[70vh] overflow-y-auto",
        large: "max-h-[80vh] overflow-y-auto",
        full: "max-h-[85vh] overflow-y-auto"
    };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if openState}
    <!-- Test modal without Skeleton -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background: rgba(0,0,0,0.5);"
        onclick={handleBackdropClick}
    >
        <div onclick={(e) => e.stopPropagation()} class="relative">
            <div
                class="modal-content bg-surface-50 dark:bg-surface-900 rounded-2xl w-full shadow-2xl border border-surface-300 dark:border-surface-600 flex flex-col {sizeClasses[size]} {containerClasses[size]}"
            >
                {#if title || icon || showCloseButton}
                    <header
                        class="flex items-center justify-between py-2 px-6 pt-2 border-b border-surface-200 dark:border-surface-700 flex-shrink-0"
                    >
                        <div class="flex items-center gap-3">
                            {#if icon}
                                <div class="flex-shrink-0">
                                    <Icon
                                        data={icon}
                                        class="w-5 h-5 text-surface-600 dark:text-surface-400"
                                    />
                                </div>
                            {/if}
                            {#if title}
                                <h2
                                    class="text-lg font-semibold text-surface-900 dark:text-surface-100 truncate"
                                >
                                    {title}
                                </h2>
                            {/if}
                        </div>
                        {#if showCloseButton}
                            <button
                                type="button"
                                onclick={cleanup}
                                class="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                                aria-label="Close modal"
                            >
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    ></path>
                                </svg>
                            </button>
                        {/if}
                    </header>
                {/if}

                <div class="modal-body flex-1 overflow-y-auto px-6 py-4">
                    {@render children()}
                </div>

                {#if footer}
                    <div class="modal-footer flex-shrink-0 px-6 py-4 border-t border-surface-300 dark:border-surface-600">
                        {@render footer()}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

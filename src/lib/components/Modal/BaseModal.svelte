<script lang="ts">
    import type { Snippet } from "svelte";
    import { modalStore } from "./ModalStore.svelte";
    import Icon from "svelte-awesome/components/Icon.svelte";

    interface Props {
        children: Snippet;
        title?: string;
        icon?: any;
        showCloseButton?: boolean;
        onClose?: () => void;
    }

    let {
        children,
        title,
        icon,
        showCloseButton = true,
        onClose = () => {},
    }: Props = $props();

    export function modalClose() {
        onClose();
        if (modalStore) {
            modalStore.reset();
        }
    }

    function handleBackdropClick() {
        modalClose();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            modalClose();
        }
    }

    let openState = $state(true);
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
                class="modal-content bg-surface-50 dark:bg-surface-900 px-6 pb-6 pt-2 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-surface-300 dark:border-surface-600"
            >
                {#if title || icon || showCloseButton}
                    <header
                        class="flex items-center justify-between py-2 px-1 mb-4 border-b border-surface-200 dark:border-surface-700"
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
                                onclick={modalClose}
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

                <div class="modal-body">
                    {@render children()}
                </div>
            </div>
        </div>
    </div>
{/if}

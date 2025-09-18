<script lang="ts">
    import BaseModal from "$lib/components/Modal/BaseModal.svelte";
    import { closeModal } from "$lib/components/Modal/ModalStore.svelte";

    interface Props {
        onConfirm?: () => void;
    }

    let { onConfirm = () => {} }: Props = $props();

    function handleConfirm() {
        onConfirm();
        closeModal();
    }

    function handleClose() {
        closeModal();
    }
</script>

<BaseModal size="medium" showDefaultHeader={false}>
    {#snippet header()}
        <div
            id="prout"
            class="flex items-center justify-between bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 -mx-6 -my-2 rounded-t-2xl"
        >
            <div class="flex items-center space-x-3">
                <div
                    class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                >
                    <span class="text-xl">🎨</span>
                </div>
                <div>
                    <h2 class="text-xl font-bold">Custom Header Design</h2>
                    <p class="text-sm opacity-90">
                        With gradient background and emoji
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={handleClose}
                class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                aria-label="Close custom modal"
            >
                <span class="text-white text-lg font-bold">×</span>
            </button>
        </div>
    {/snippet}

    {#snippet footer()}
        <div class="flex justify-end space-x-3">
            <button
                type="button"
                onclick={handleClose}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-4 py-2 rounded-lg transition-colors duration-150"
            >
                Close
            </button>
            <button
                type="button"
                onclick={handleConfirm}
                class="btn bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-150"
            >
                Amazing!
            </button>
        </div>
    {/snippet}

    <div class="text-surface-700 dark:text-surface-300">
        <p class="mb-4">
            This modal uses a <strong>completely custom header snippet</strong> with:
        </p>
        <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Gradient background (purple to blue)</li>
            <li>Emoji icon instead of FontAwesome</li>
            <li>Title with subtitle</li>
            <li>Custom styled close button</li>
            <li>Full width header that bleeds to modal edges</li>
            <li>Rounded top corners to match modal</li>
        </ul>
        <p class="mt-4">
            The header snippet completely overrides the default header, giving
            you total control over the design!
        </p>
        <p class="mt-3 text-sm text-surface-500 dark:text-surface-400">
            Notice how the custom footer also uses the gradient styling to match
            the header theme.
        </p>
    </div>
</BaseModal>

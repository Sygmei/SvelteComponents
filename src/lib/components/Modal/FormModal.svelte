<script lang="ts">
    import type { Snippet } from "svelte";
    import BaseModal from "./BaseModal.svelte";

    interface Props {
        title?: string;
        children: Snippet;
        actions?: Snippet;
        onClose?: () => void;
        showCloseButton?: boolean;
    }

    let {
        title,
        children,
        actions,
        onClose = () => {},
        showCloseButton = true
    }: Props = $props();

    let modalRef: BaseModal;

    export function close() {
        modalRef?.modalClose();
    }

    function handleClose() {
        onClose();
    }
</script>

<BaseModal bind:this={modalRef} {title} {showCloseButton} onClose={handleClose}>
    <div class="space-y-6">
        <div class="modal-content">
            {@render children()}
        </div>

        {#if actions}
            <div class="flex justify-end space-x-3 pt-4 border-t border-surface-300 dark:border-surface-600">
                {@render actions()}
            </div>
        {/if}
    </div>
</BaseModal>
<script module lang="ts">
    import type { Component, ComponentProps } from "svelte";

    type ModalComponent = Component;

    export interface ModalSettings {
        modal: ModalComponent;
        props: ComponentProps<ModalComponent>;
    }

    let activeModal = $state<ModalSettings | null>(null);

    export function setActiveModal(settings: ModalSettings) {
        activeModal = settings;
    }

    export function closeModal() {
        activeModal = null;
    }
</script>

{#if activeModal}
    {@const CurrentModalComponent = activeModal.modal}
    <CurrentModalComponent {...activeModal.props} />
{/if}

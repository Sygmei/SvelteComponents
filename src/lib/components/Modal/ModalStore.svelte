<script module lang="ts">
    import type { Component, ComponentProps } from "svelte";

    type ModalComponent = Component;

    export interface ModalSettings {
        modal: ModalComponent;
        props: ComponentProps<ModalComponent>;
    }

    export let modalStore: any = null;
</script>

<script lang="ts">
    let currentSettings: ModalSettings | null = $state(null);

    export function selfRegister(self: any) {
        modalStore = self;
    }

    export function reset() {
        currentSettings = null;
    }

    export function trigger(modalSettings: ModalSettings) {
        currentSettings = modalSettings;
    }
</script>

<div>
    {#if currentSettings}
        {@const CurrentModalComponent = currentSettings.modal}
        <CurrentModalComponent {...currentSettings.props} />
    {/if}
</div>

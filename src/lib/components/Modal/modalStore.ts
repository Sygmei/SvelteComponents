import type { Component, ComponentProps } from "svelte";

type ModalComponent = Component;

export interface ModalSettings {
    modal: ModalComponent;
    props: ComponentProps<ModalComponent>;
}

export let modalStoreActiveModal = $state<ModalSettings | null>(null);

export function triggerModal(settings: ModalSettings) {
    modalStoreActiveModal = settings;
}

export function closeModal() {
    modalStoreActiveModal = null;
}
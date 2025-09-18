import { modalStore } from "./ModalStore.svelte";
import ConfirmModal from "./ConfirmModal.svelte";
import ContactFormModal from "./ContactFormModal.svelte";
import type { ModalSettings } from "./ModalStore.svelte";

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger" | "warning" | "success";
    icon?: any;
    onConfirm: () => void;
    onCancel?: () => void;
}

export interface ContactFormOptions {
    formData?: {
        name: string;
        email: string;
        message: string;
    };
    title?: string;
    icon?: any;
    onSubmit: (data: { name: string; email: string; message: string }) => void;
    onCancel?: () => void;
}

export function showConfirmModal(options: ConfirmOptions) {
    const modalSettings: ModalSettings = {
        modal: ConfirmModal,
        props: {
            title: options.title || "Confirm Action",
            message: options.message,
            confirmText: options.confirmText || "Confirm",
            cancelText: options.cancelText || "Cancel",
            variant: options.variant || "default",
            icon: options.icon,
            onConfirm: options.onConfirm,
            onCancel: options.onCancel || (() => {}),
        },
    };
    modalStore?.trigger(modalSettings);
}

export function showDeleteConfirmModal(itemName: string, onConfirm: () => void, onCancel?: () => void) {
    showConfirmModal({
        title: `Delete ${itemName}`,
        message: `This action cannot be undone. Are you sure you want to delete this ${itemName.toLowerCase()}?`,
        confirmText: "Delete",
        variant: "danger",
        onConfirm,
        onCancel,
    });
}

export function showContactFormModal(options: ContactFormOptions) {
    const modalSettings: ModalSettings = {
        modal: ContactFormModal,
        props: {
            formData: options.formData || { name: "", email: "", message: "" },
            title: options.title || "Contact Form",
            icon: options.icon,
            onSubmit: options.onSubmit,
            onCancel: options.onCancel || (() => {}),
        },
    };
    modalStore?.trigger(modalSettings);
}

export function closeModal() {
    modalStore?.reset();
}
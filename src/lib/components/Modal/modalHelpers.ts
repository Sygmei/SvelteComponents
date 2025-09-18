import ConfirmModal from "./ConfirmModal.svelte";
import ContactFormModal from "./ContactFormModal.svelte";
import TagSelectionModal from "./TagSelectionModal.svelte";
import PromptModal from "./PromptModal.svelte";
import { setActiveModal, type ModalSettings } from "./ModalStore.svelte";
import type { Tag } from "$lib/components/AutocompleteTagsInput";

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger" | "warning" | "success";
    icon?: any;
    size?: "small" | "medium" | "large" | "full";
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
    size?: "small" | "medium" | "large" | "full";
    onSubmit: (data: { name: string; email: string; message: string }) => void;
    onCancel?: () => void;
}

export interface TagSelectionOptions {
    title?: string;
    icon?: any;
    initialTags?: Tag[];
    placeholder?: string;
    maxTags?: number;
    allowDuplicates?: boolean;
    completer?: (query: string) => Promise<string[]> | string[];
    tagColorFunction?: (tagValue: string) => string;
    confirmText?: string;
    cancelText?: string;
    size?: "small" | "medium" | "large" | "full";
    onSubmit: (tags: Tag[]) => void;
    onCancel?: () => void;
}

export interface PromptOptions {
    title?: string;
    icon?: any;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    inputType?: "text" | "email" | "password" | "number" | "url" | "tel";
    maxLength?: number;
    required?: boolean;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "primary" | "success" | "warning" | "danger";
    validation?: (value: string) => string | null;
    size?: "small" | "medium" | "large" | "full";
    onConfirm: (value: string) => void;
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
            size: options.size || "medium",
            onConfirm: options.onConfirm,
            onCancel: options.onCancel || (() => { }),
        },
    };
    setActiveModal(modalSettings);
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
            size: options.size || "medium",
            onSubmit: options.onSubmit,
            onCancel: options.onCancel || (() => { }),
        },
    };
    setActiveModal(modalSettings);
}

export function showTagSelectionModal(options: TagSelectionOptions) {
    const modalSettings: ModalSettings = {
        modal: TagSelectionModal,
        props: {
            title: options.title || "Select Tags",
            icon: options.icon,
            initialTags: options.initialTags || [],
            placeholder: options.placeholder || "Add tags...",
            maxTags: options.maxTags,
            allowDuplicates: options.allowDuplicates || false,
            completer: options.completer || (async () => []),
            tagColorFunction: options.tagColorFunction,
            confirmText: options.confirmText || "Apply Tags",
            cancelText: options.cancelText || "Cancel",
            size: options.size || "medium",
            onSubmit: options.onSubmit,
            onCancel: options.onCancel || (() => {}),
        },
    };
    setActiveModal(modalSettings);
}

export function showPromptModal(options: PromptOptions) {
    const modalSettings: ModalSettings = {
        modal: PromptModal,
        props: {
            title: options.title || "Enter Value",
            icon: options.icon,
            message: options.message,
            placeholder: options.placeholder || "Enter value...",
            defaultValue: options.defaultValue || "",
            inputType: options.inputType || "text",
            maxLength: options.maxLength,
            required: options.required !== undefined ? options.required : true,
            confirmText: options.confirmText || "Confirm",
            cancelText: options.cancelText || "Cancel",
            variant: options.variant || "primary",
            validation: options.validation,
            size: options.size || "medium",
            onConfirm: options.onConfirm,
            onCancel: options.onCancel || (() => {}),
        },
    };
    setActiveModal(modalSettings);
}
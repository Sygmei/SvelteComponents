<script lang="ts">
    import {
        ConfirmModal,
        showConfirmModal,
        showContactFormModal,
    } from "$lib/components/Modal";
    import type { ModalSettings } from "$lib/components/Modal";

    // Import icons from svelte-awesome
    import {
        faQuestionCircle,
        faTrash,
        faExclamationTriangle,
        faCheckCircle,
        faEnvelope,
        faUser,
        faInfoCircle,
    } from "@fortawesome/free-solid-svg-icons";

    let formData = $state({
        name: "",
        email: "",
        message: "",
    });

    function handleConfirm(message: string) {
        alert(`Confirmed: ${message}`);
    }

    function handleCancel(message: string) {
        alert(`Cancelled: ${message}`);
    }

    function handleFormSubmit(data: {
        name: string;
        email: string;
        message: string;
    }) {
        alert(
            `Form submitted:\nName: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`,
        );
        // Update local form data
        formData = { ...data };
        // Reset form
        formData = { name: "", email: "", message: "" };
    }

    function openBasicModal() {
        showConfirmModal({
            message: "Are you sure you want to proceed with this action?",
            icon: faQuestionCircle,
            onConfirm: () => handleConfirm("basic action"),
            onCancel: () => handleCancel("basic action"),
        });
    }

    function openDangerModal() {
        const modalSettings: ModalSettings = {
            modal: ConfirmModal,
            props: {
                title: "Delete Item",
                message:
                    "This action cannot be undone. Are you sure you want to delete this item?",
                confirmText: "Delete",
                variant: "danger",
                icon: faTrash,
                onConfirm: () => handleConfirm("delete"),
                onCancel: () => handleCancel("delete"),
            },
        };
        setActiveModal(modalSettings);
    }

    function openWarningModal() {
        showConfirmModal({
            title: "Warning",
            message: "This action may have unintended consequences. Continue?",
            confirmText: "Continue",
            variant: "warning",
            icon: faExclamationTriangle,
            onConfirm: () => handleConfirm("warning action"),
            onCancel: () => handleCancel("warning action"),
        });
    }

    function openSuccessModal() {
        showConfirmModal({
            title: "Success",
            message:
                "Operation completed successfully. Would you like to continue?",
            confirmText: "Yes, Continue",
            variant: "success",
            icon: faCheckCircle,
            onConfirm: () => handleConfirm("success action"),
            onCancel: () => handleCancel("success action"),
        });
    }

    function openFormModal() {
        showContactFormModal({
            formData: { ...formData },
            title: "Contact Us",
            icon: faEnvelope,
            onSubmit: handleFormSubmit,
            onCancel: () => alert("Form cancelled"),
        });
    }

    function openStoreModal() {
        const modalSettings: ModalSettings = {
            modal: ConfirmModal,
            props: {
                title: "Store Modal Example",
                message: "This modal was opened using the modal store system!",
                variant: "success",
                icon: faInfoCircle,
                onConfirm: () => alert("Store modal confirmed!"),
                onCancel: () => alert("Store modal cancelled!"),
            },
        };
        setActiveModal(modalSettings);
    }

    // Simple modal store import
    import ModalStore from "$lib/components/Modal/ModalStore.svelte";
    import { setActiveModal } from "../../lib/components/Modal/ModalStore.svelte";
</script>

<svelte:head>
    <title>Modal Demo</title>
</svelte:head>

<ModalStore />
<div class="container h-full mx-auto flex justify-center items-center">
    <div class="space-y-8 w-full max-w-4xl p-8">
        <header class="text-center space-y-4">
            <h1 class="text-4xl font-bold">Modal Component Demo</h1>
            <p class="text-xl text-surface-600 dark:text-surface-400">
                Flexible modal components built on BaseModal with Skeleton UI
            </p>
        </header>

        <div class="space-y-10">
            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Confirmation Modals</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Different variants of confirmation modals with various
                        styling options
                    </p>
                </header>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onclick={openBasicModal}
                        class="btn bg-primary-500 hover:bg-primary-600 text-white"
                    >
                        Basic Confirm
                    </button>
                    <button
                        type="button"
                        onclick={openDangerModal}
                        class="btn bg-error-500 hover:bg-error-600 text-white"
                    >
                        Danger Confirm
                    </button>
                    <button
                        type="button"
                        onclick={openWarningModal}
                        class="btn bg-warning-500 hover:bg-warning-600 text-white"
                    >
                        Warning Confirm
                    </button>
                    <button
                        type="button"
                        onclick={openSuccessModal}
                        class="btn bg-success-500 hover:bg-success-600 text-white"
                    >
                        Success Confirm
                    </button>
                </div>
            </section>

            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Form Modal</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Custom modal with form content and custom actions
                    </p>
                </header>
                <button
                    type="button"
                    onclick={openFormModal}
                    class="btn bg-secondary-500 hover:bg-secondary-600 text-white"
                >
                    Open Form Modal
                </button>
            </section>

            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Helper Functions</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Simplified functions for common modal patterns
                    </p>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onclick={() => {
                            const modalSettings: ModalSettings = {
                                modal: ConfirmModal,
                                props: {
                                    title: "Delete User Account",
                                    message:
                                        "This action cannot be undone. Are you sure you want to delete this User Account?",
                                    confirmText: "Delete",
                                    variant: "danger",
                                    icon: faUser,
                                    onConfirm: () => alert("Account deleted!"),
                                    onCancel: () => {},
                                },
                            };
                            setActiveModal(modalSettings);
                        }}
                        class="btn bg-error-500 hover:bg-error-600 text-white"
                    >
                        Quick Delete Confirm
                    </button>
                    <button
                        type="button"
                        onclick={() =>
                            showConfirmModal({
                                message: "Quick helper function demo!",
                                variant: "success",
                                icon: faCheckCircle,
                                onConfirm: () => alert("Helper used!"),
                            })}
                        class="btn bg-success-500 hover:bg-success-600 text-white"
                    >
                        Quick Success Modal
                    </button>
                </div>
            </section>

            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Modal Store System</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Programmatically open modals using the modal store
                    </p>
                </header>
                <button
                    type="button"
                    onclick={openStoreModal}
                    class="btn bg-tertiary-500 hover:bg-tertiary-600 text-white"
                >
                    Open Store Modal
                </button>
            </section>
        </div>

        <aside
            class="card p-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-600 rounded-2xl"
        >
            <h3 class="text-xl font-bold mb-4">Features</h3>
            <div class="grid md:grid-cols-2 gap-4">
                <ul class="space-y-2">
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-primary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Escape key to close</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-primary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Click backdrop to close</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-primary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Customizable title and close button</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-primary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Multiple modal variants</span>
                    </li>
                </ul>
                <ul class="space-y-2">
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-secondary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Built on Skeleton UI Modal</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-secondary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Reusable BaseModal component</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-secondary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Modal store for programmatic control</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <span class="chip bg-secondary-500 text-white text-sm"
                            >✓</span
                        >
                        <span>Flexible content with snippets</span>
                    </li>
                </ul>
            </div>
        </aside>
    </div>
</div>

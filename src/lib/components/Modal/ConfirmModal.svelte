<script lang="ts">
    import BaseModal from "./BaseModal.svelte";

    interface Props {
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        onCancel?: () => void;
        onClose?: () => void;
        variant?: "default" | "danger" | "warning" | "success";
        icon?: any;
    }

    let {
        title = "Confirm Action",
        message,
        confirmText = "Confirm",
        cancelText = "Cancel",
        onConfirm,
        onCancel = () => {},
        onClose = () => {},
        variant = "default",
        icon
    }: Props = $props();

    let modalRef: BaseModal;

    function handleConfirm() {
        onConfirm();
        modalRef?.modalClose();
    }

    function handleCancel() {
        onCancel();
        modalRef?.modalClose();
    }

    function handleClose() {
        onClose();
    }

    const variantStyles = {
        default: "bg-primary-500 hover:bg-primary-600 text-white",
        danger: "bg-error-500 hover:bg-error-600 text-white",
        warning: "bg-warning-500 hover:bg-warning-600 text-white",
        success: "bg-success-500 hover:bg-success-600 text-white"
    };
</script>

<BaseModal bind:this={modalRef} {title} {icon} onClose={handleClose}>
    <div class="space-y-6">
        <div class="text-surface-700 dark:text-surface-300">
            <p>{message}</p>
        </div>

        <div class="flex justify-end space-x-3">
            <button
                type="button"
                onclick={handleCancel}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-4 py-2 rounded-lg transition-colors duration-150"
            >
                {cancelText}
            </button>
            <button
                type="button"
                onclick={handleConfirm}
                class="btn {variantStyles[variant]} px-4 py-2 rounded-lg transition-colors duration-150"
            >
                {confirmText}
            </button>
        </div>
    </div>
</BaseModal>
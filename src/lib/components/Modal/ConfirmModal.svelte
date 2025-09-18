<script lang="ts">
    import { closeModal } from "./ModalStore.svelte";
    import BaseModal from "./BaseModal.svelte";

    interface Props {
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        variant?: "default" | "danger" | "warning" | "success";
        icon?: any;
        size?: "small" | "medium" | "large" | "full";
    }

    let {
        title = "Confirm Action",
        message,
        confirmText = "Confirm",
        cancelText = "Cancel",
        onConfirm,
        variant = "default",
        icon,
        size = "medium",
    }: Props = $props();

    const variantStyles = {
        default: "btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-150",
        danger: "btn bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg transition-colors duration-150",
        warning: "btn bg-warning-500 hover:bg-warning-600 text-white px-4 py-2 rounded-lg transition-colors duration-150",
        success: "btn bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg transition-colors duration-150",
    };
</script>

<BaseModal
    {title}
    {icon}
    {size}
    showDefaultFooter={true}
    {confirmText}
    {cancelText}
    confirmButtonClass={variantStyles[variant]}
    {onConfirm}
    onCancel={() => {}}
>
    <div class="text-surface-700 dark:text-surface-300">
        <p>{message}</p>
    </div>
</BaseModal>

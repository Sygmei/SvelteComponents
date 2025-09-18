<script lang="ts">
    import BaseModal from "./BaseModal.svelte";
    import { closeModal } from "./ModalStore.svelte";

    interface Props {
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
        onConfirm: (value: string) => void;
        onCancel?: () => void;
        validation?: (value: string) => string | null; // Returns error message or null
    }

    let {
        title = "Enter Value",
        icon,
        message,
        placeholder = "Enter value...",
        defaultValue = "",
        inputType = "text",
        maxLength,
        required = true,
        confirmText = "Confirm",
        cancelText = "Cancel",
        variant = "primary",
        onConfirm,
        onCancel = () => {},
        validation
    }: Props = $props();

    let inputValue = $state(defaultValue);
    let inputElement: HTMLInputElement;
    let errorMessage = $state<string | null>(null);

    // Focus input when modal opens
    $effect(() => {
        if (inputElement) {
            setTimeout(() => {
                inputElement.focus();
            }, 100);
        }
    });

    // Validate input in real-time
    $effect(() => {
        if (validation && inputValue) {
            errorMessage = validation(inputValue);
        } else {
            errorMessage = null;
        }
    });

    function handleSubmit() {
        const trimmedValue = inputValue.trim();

        // Basic validation
        if (required && !trimmedValue) {
            errorMessage = "This field is required";
            inputElement?.focus();
            return;
        }

        // Custom validation
        if (validation) {
            const validationError = validation(trimmedValue);
            if (validationError) {
                errorMessage = validationError;
                inputElement?.focus();
                return;
            }
        }

        onConfirm(trimmedValue);
        closeModal();
    }

    function handleCancel() {
        onCancel();
        closeModal();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
        }
    }

    const variantStyles = {
        default: "bg-surface-500 hover:bg-surface-600 text-white",
        primary: "bg-primary-500 hover:bg-primary-600 text-white",
        success: "bg-success-500 hover:bg-success-600 text-white",
        warning: "bg-warning-500 hover:bg-warning-600 text-white",
        danger: "bg-error-500 hover:bg-error-600 text-white"
    };

    const inputBorderStyles = {
        default: "border-surface-300 dark:border-surface-600 focus:border-surface-500 dark:focus:border-surface-400",
        primary: "border-surface-300 dark:border-surface-600 focus:border-primary-500 dark:focus:border-primary-400",
        success: "border-surface-300 dark:border-surface-600 focus:border-success-500 dark:focus:border-success-400",
        warning: "border-surface-300 dark:border-surface-600 focus:border-warning-500 dark:focus:border-warning-400",
        danger: "border-surface-300 dark:border-surface-600 focus:border-error-500 dark:focus:border-error-400"
    };
</script>

<BaseModal {title} {icon}>
    <div class="space-y-6">
        {#if message}
            <div class="text-surface-700 dark:text-surface-300">
                <p>{message}</p>
            </div>
        {/if}

        <div class="space-y-2">
            <div class="relative">
                <input
                    bind:this={inputElement}
                    bind:value={inputValue}
                    type={inputType}
                    {placeholder}
                    {maxLength}
                    onkeydown={handleKeydown}
                    class="w-full px-4 py-3 text-lg border-2 rounded-xl bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 {inputBorderStyles[variant]} {errorMessage ? 'border-error-500 dark:border-error-400' : ''} {variant === 'primary' ? 'focus:ring-primary-500' : variant === 'success' ? 'focus:ring-success-500' : variant === 'warning' ? 'focus:ring-warning-500' : variant === 'danger' ? 'focus:ring-error-500' : 'focus:ring-surface-500'}"
                    class:animate-shake={errorMessage}
                />

                {#if maxLength}
                    <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-surface-400 dark:text-surface-500">
                        {inputValue.length}/{maxLength}
                    </div>
                {/if}
            </div>

            {#if errorMessage}
                <div class="flex items-center space-x-2 text-error-600 dark:text-error-400 text-sm">
                    <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <span>{errorMessage}</span>
                </div>
            {/if}
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-surface-300 dark:border-surface-600">
            <button
                type="button"
                onclick={handleCancel}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-6 py-2.5 rounded-xl transition-all duration-150 font-medium"
            >
                {cancelText}
            </button>
            <button
                type="button"
                onclick={handleSubmit}
                disabled={required && !inputValue.trim()}
                class="btn {variantStyles[variant]} px-6 py-2.5 rounded-xl transition-all duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
                {confirmText}
            </button>
        </div>
    </div>
</BaseModal>

<style>
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
    }

    .animate-shake {
        animation: shake 0.3s ease-in-out;
    }
</style>
<script lang="ts">
    import BaseModal from "./BaseModal.svelte";
    import { closeModal } from "./ModalStore.svelte";

    interface Props {
        formData?: {
            name: string;
            email: string;
            message: string;
        };
        onSubmit: (data: {
            name: string;
            email: string;
            message: string;
        }) => void;
        onClose?: () => void;
        title?: string;
        icon?: any;
        size?: "small" | "medium" | "large" | "full";
    }

    let {
        formData = { name: "", email: "", message: "" },
        onSubmit,
        onClose = () => {},
        title = "Contact Form",
        icon,
        size = "medium",
    }: Props = $props();

    let modalRef: BaseModal;
    let localFormData = $state({ ...formData });

    function handleSubmit() {
        onSubmit(localFormData);
        closeModal();
    }

    $effect(() => {
        localFormData = { ...formData };
    });
</script>

<BaseModal bind:this={modalRef} {title} {icon} {size} {onClose}>
    {#snippet footer()}
        <div class="flex justify-end space-x-3">
            <button
                type="button"
                onclick={closeModal}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-4 py-2 rounded-lg"
            >
                Cancel
            </button>
            <button
                type="button"
                onclick={handleSubmit}
                class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg"
                disabled={!localFormData.name ||
                    !localFormData.email ||
                    !localFormData.message}
            >
                Submit
            </button>
        </div>
    {/snippet}

    <form class="space-y-4">
        <div>
            <label for="name" class="block text-sm font-medium mb-2"
                >Name</label
            >
            <input
                id="name"
                type="text"
                bind:value={localFormData.name}
                class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                required
            />
        </div>
        <div>
            <label for="email" class="block text-sm font-medium mb-2"
                >Email</label
            >
            <input
                id="email"
                type="email"
                bind:value={localFormData.email}
                class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                required
            />
        </div>
        <div>
            <label for="message" class="block text-sm font-medium mb-2"
                >Message</label
            >
            <textarea
                id="message"
                bind:value={localFormData.message}
                rows="4"
                class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                required
            ></textarea>
        </div>
    </form>
</BaseModal>

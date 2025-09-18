<script lang="ts">
    import BaseModal from "./BaseModal.svelte";

    interface Props {
        formData?: {
            name: string;
            email: string;
            message: string;
        };
        onSubmit: (data: { name: string; email: string; message: string }) => void;
        onCancel?: () => void;
        onClose?: () => void;
        title?: string;
        icon?: any;
    }

    let {
        formData = { name: "", email: "", message: "" },
        onSubmit,
        onCancel = () => {},
        onClose = () => {},
        title = "Contact Form",
        icon
    }: Props = $props();

    let modalRef: BaseModal;
    let localFormData = $state({ ...formData });

    function handleSubmit() {
        onSubmit(localFormData);
        modalRef?.modalClose();
    }

    function handleCancel() {
        onCancel();
        modalRef?.modalClose();
    }

    function handleClose() {
        onClose();
    }

    $effect(() => {
        localFormData = { ...formData };
    });
</script>

<BaseModal bind:this={modalRef} {title} {icon} onClose={handleClose}>
    <div class="space-y-6">
        <form class="space-y-4">
            <div>
                <label for="name" class="block text-sm font-medium mb-2">Name</label>
                <input
                    id="name"
                    type="text"
                    bind:value={localFormData.name}
                    class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                    required
                />
            </div>
            <div>
                <label for="email" class="block text-sm font-medium mb-2">Email</label>
                <input
                    id="email"
                    type="email"
                    bind:value={localFormData.email}
                    class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                    required
                />
            </div>
            <div>
                <label for="message" class="block text-sm font-medium mb-2">Message</label>
                <textarea
                    id="message"
                    bind:value={localFormData.message}
                    rows="4"
                    class="input w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-900"
                    required
                ></textarea>
            </div>
        </form>

        <div class="flex justify-end space-x-3 pt-4 border-t border-surface-300 dark:border-surface-600">
            <button
                type="button"
                onclick={handleCancel}
                class="btn bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 px-4 py-2 rounded-lg"
            >
                Cancel
            </button>
            <button
                type="button"
                onclick={handleSubmit}
                class="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg"
                disabled={!localFormData.name || !localFormData.email || !localFormData.message}
            >
                Submit
            </button>
        </div>
    </div>
</BaseModal>
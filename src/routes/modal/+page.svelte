<script lang="ts">
    import {
        BaseModal,
        ConfirmModal,
        showConfirmModal,
        showContactFormModal,
        showTagSelectionModal,
        showPromptModal,
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
        faTags,
        faEdit,
    } from "@fortawesome/free-solid-svg-icons";

    let formData = $state({
        name: "",
        email: "",
        message: "",
    });

    let selectedTags = $state([]);

    // Sample completer for tag modal
    async function techCompleter(query: string): Promise<string[]> {
        const suggestions = [
            "JavaScript", "TypeScript", "Svelte", "React", "Vue", "Angular",
            "Node.js", "Python", "Java", "C++", "Rust", "Go", "PHP", "Ruby"
        ];
        return suggestions.filter((suggestion) =>
            suggestion.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Tag color function
    function getTagColor(tagValue: string): string {
        const colors = {
            "JavaScript": "#f7df1e", "TypeScript": "#3178c6", "Python": "#3776ab",
            "Java": "#ed8b00", "Rust": "#ce422b", "Go": "#00add8",
            "React": "#61dafb", "Vue": "#4fc08d", "Svelte": "#ff3e00"
        };
        return colors[tagValue] || `hsl(${tagValue.length * 137.508 % 360}, 65%, 50%)`;
    }

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

    function openTagModal() {
        showTagSelectionModal({
            title: "Select Skills",
            icon: faTags,
            initialTags: selectedTags,
            placeholder: "Add your skills...",
            maxTags: 5,
            allowDuplicates: false,
            completer: techCompleter,
            tagColorFunction: getTagColor,
            confirmText: "Save Skills",
            onSubmit: (tags) => {
                selectedTags = tags;
                alert(`Selected ${tags.length} skills: ${tags.map(t => t.value).join(', ')}`);
            },
            onCancel: () => alert("Tag selection cancelled"),
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
                    <h2 class="text-2xl font-bold">Tag Selection Modal</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Modal containing AutocompleteTagsInput for skill/tag selection
                    </p>
                </header>
                <div class="flex flex-col space-y-3">
                    <button
                        type="button"
                        onclick={openTagModal}
                        class="btn bg-purple-500 hover:bg-purple-600 text-white"
                    >
                        Select Skills
                    </button>
                    {#if selectedTags.length > 0}
                        <div class="flex flex-wrap gap-2">
                            <span class="text-sm text-surface-600 dark:text-surface-400">Current skills:</span>
                            {#each selectedTags as tag}
                                <span
                                    class="chip text-white text-sm"
                                    style="background-color: {getTagColor(tag.value)};"
                                >
                                    {tag.value}
                                </span>
                            {/each}
                        </div>
                    {/if}
                </div>
            </section>

            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Prompt Modal</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Beautiful input prompts with validation and different input types
                    </p>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onclick={() => showPromptModal({
                            title: "Enter Your Name",
                            message: "Please provide your full name for the profile:",
                            placeholder: "e.g. John Doe",
                            icon: faUser,
                            variant: "primary",
                            onConfirm: (name) => alert(`Hello, ${name}!`)
                        })}
                        class="btn bg-primary-500 hover:bg-primary-600 text-white"
                    >
                        Name Prompt
                    </button>
                    <button
                        type="button"
                        onclick={() => showPromptModal({
                            title: "Enter Email",
                            message: "We'll use this to send you updates:",
                            placeholder: "your.email@example.com",
                            inputType: "email",
                            icon: faEnvelope,
                            variant: "success",
                            validation: (email) => {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                return emailRegex.test(email) ? null : "Please enter a valid email address";
                            },
                            onConfirm: (email) => alert(`Email saved: ${email}`)
                        })}
                        class="btn bg-success-500 hover:bg-success-600 text-white"
                    >
                        Email Prompt
                    </button>
                    <button
                        type="button"
                        onclick={() => showPromptModal({
                            title: "Set Password",
                            message: "Create a secure password (minimum 8 characters):",
                            placeholder: "Enter password...",
                            inputType: "password",
                            icon: faExclamationTriangle,
                            variant: "warning",
                            validation: (password) => {
                                if (password.length < 8) return "Password must be at least 8 characters";
                                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return "Password must contain uppercase, lowercase, and number";
                                return null;
                            },
                            onConfirm: (password) => alert("Password set successfully!")
                        })}
                        class="btn bg-warning-500 hover:bg-warning-600 text-white"
                    >
                        Password Prompt
                    </button>
                    <button
                        type="button"
                        onclick={() => showPromptModal({
                            title: "Enter Message",
                            message: "Share your thoughts with us:",
                            placeholder: "Type your message here...",
                            maxLength: 280,
                            icon: faEdit,
                            variant: "default",
                            confirmText: "Send Message",
                            onConfirm: (message) => alert(`Message sent: "${message}"`)
                        })}
                        class="btn bg-surface-500 hover:bg-surface-600 text-white"
                    >
                        Message Prompt
                    </button>
                </div>
            </section>

            <section
                class="card p-6 space-y-4 bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-2xl"
            >
                <header class="space-y-2">
                    <h2 class="text-2xl font-bold">Modal Sizes</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        Different modal sizes: small, medium, large, and almost-full-screen
                    </p>
                </header>
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Long Content (Lorem Ipsum)</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onclick={() => showConfirmModal({
                            title: "Small Modal Size Demo",
                            message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                            icon: faInfoCircle,
                            size: "small",
                            onConfirm: () => alert("Small modal confirmed!")
                        })}
                        class="btn bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        Small Size
                    </button>
                    <button
                        type="button"
                        onclick={() => showConfirmModal({
                            title: "Medium Modal Size Demo",
                            message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                            icon: faInfoCircle,
                            size: "medium",
                            onConfirm: () => alert("Medium modal confirmed!")
                        })}
                        class="btn bg-green-500 hover:bg-green-600 text-white"
                    >
                        Medium Size
                    </button>
                    <button
                        type="button"
                        onclick={() => showConfirmModal({
                            title: "Large Modal Size Demo",
                            message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                            icon: faInfoCircle,
                            size: "large",
                            onConfirm: () => alert("Large modal confirmed!")
                        })}
                        class="btn bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        Large Size
                    </button>
                    <button
                        type="button"
                        onclick={() => showConfirmModal({
                            title: "Full Modal Size Demo",
                            message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                            icon: faInfoCircle,
                            size: "full",
                            onConfirm: () => alert("Full modal confirmed!")
                        })}
                        class="btn bg-purple-500 hover:bg-purple-600 text-white"
                    >
                        Full Size
                    </button>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Short Content ("Hello")</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                type="button"
                                onclick={() => showConfirmModal({
                                    title: "Small Modal",
                                    message: "Hello",
                                    icon: faInfoCircle,
                                    size: "small",
                                    onConfirm: () => alert("Small modal confirmed!")
                                })}
                                class="btn bg-blue-400 hover:bg-blue-500 text-white"
                            >
                                Small + Hello
                            </button>
                            <button
                                type="button"
                                onclick={() => showConfirmModal({
                                    title: "Medium Modal",
                                    message: "Hello",
                                    icon: faInfoCircle,
                                    size: "medium",
                                    onConfirm: () => alert("Medium modal confirmed!")
                                })}
                                class="btn bg-green-400 hover:bg-green-500 text-white"
                            >
                                Medium + Hello
                            </button>
                            <button
                                type="button"
                                onclick={() => showConfirmModal({
                                    title: "Large Modal",
                                    message: "Hello",
                                    icon: faInfoCircle,
                                    size: "large",
                                    onConfirm: () => alert("Large modal confirmed!")
                                })}
                                class="btn bg-orange-400 hover:bg-orange-500 text-white"
                            >
                                Large + Hello
                            </button>
                            <button
                                type="button"
                                onclick={() => showConfirmModal({
                                    title: "Full Modal",
                                    message: "Hello",
                                    icon: faInfoCircle,
                                    size: "full",
                                    onConfirm: () => alert("Full modal confirmed!")
                                })}
                                class="btn bg-purple-400 hover:bg-purple-500 text-white"
                            >
                                Full + Hello
                            </button>
                        </div>
                    </div>
                </div>
                <div class="mt-4 text-sm text-surface-600 dark:text-surface-400 space-y-2">
                    <p><strong>Small:</strong> min: 320×192px, max: 448px width - Quick confirmations</p>
                    <p><strong>Medium:</strong> min: 384×224px, max: 512px width - Standard dialogs (default)</p>
                    <p><strong>Large:</strong> min: 600×320px, max: 896px width - Complex forms and content</p>
                    <p><strong>Full:</strong> min: 80%×60% viewport, max: 95%×95% - Maximum space utilization</p>
                </div>
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
                    <h2 class="text-2xl font-bold">Default vs Custom Footer</h2>
                    <p class="text-surface-600 dark:text-surface-400">
                        BaseModal can use a default Cancel/Confirm footer or custom footer snippets
                    </p>
                </header>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onclick={() => showConfirmModal({
                            title: "Default Footer Example",
                            message: "This modal uses BaseModal's built-in default footer. ConfirmModal now uses showDefaultFooter=true instead of custom footer snippets, making it much simpler!",
                            icon: faCheckCircle,
                            confirmText: "Yes, Continue",
                            cancelText: "No, Cancel",
                            onConfirm: () => alert("Default footer confirmed!"),
                            onCancel: () => alert("Default footer cancelled!")
                        })}
                        class="btn bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        Default Footer (ConfirmModal)
                    </button>
                    <button
                        type="button"
                        onclick={() => showPromptModal({
                            title: "Custom Footer Override",
                            message: "PromptModal still uses a custom footer snippet to show specialized form actions with validation states and custom styling.",
                            placeholder: "Enter some text...",
                            icon: faEdit,
                            variant: "warning",
                            onConfirm: (value) => alert(`Custom footer prompt: "${value}"`)
                        })}
                        class="btn bg-purple-500 hover:bg-purple-600 text-white"
                    >
                        Custom Footer (PromptModal)
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

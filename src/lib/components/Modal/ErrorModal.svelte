<script lang="ts">
    import BaseModal from "./BaseModal.svelte";

    interface Props {
        errorMessage: string;
    }

    let { errorMessage }: Props = $props();
</script>

<BaseModal title="⚠️ Error Details" size="medium">
    <pre class="text-sm text-red-400 whitespace-pre-wrap break-words font-mono bg-red-500/10 rounded-lg p-4 border border-red-500/20">{errorMessage}</pre>
</BaseModal>

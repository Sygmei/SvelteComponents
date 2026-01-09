<script lang="ts">
    import { useSvelteFlow } from "@xyflow/svelte";

    interface Props {
        trigger: unknown;
    }

    let { trigger }: Props = $props();

    const { fitView } = useSvelteFlow();

    let initialized = false;

    $effect(() => {
        // Track the trigger value
        const _trigger = trigger;
        
        // Skip the first run (initial mount)
        if (!initialized) {
            initialized = true;
            return;
        }

        // Delay fitView slightly to let the layout settle
        setTimeout(() => {
            fitView({ duration: 300, padding: 0.1 });
        }, 100);
    });
</script>

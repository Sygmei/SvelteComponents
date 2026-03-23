<script lang="ts">
    import BaseModal from "$lib/components/Modal/BaseModal.svelte";
    import type {
        Rule,
        RuleChangeSummary,
        FilterDefinition,
        RuleFilter,
    } from "./types.js";

    interface Props {
        summary: RuleChangeSummary;
        filtersDefinitions?: FilterDefinition[];
        onConfirm: () => void;
        onCancel?: () => void;
    }

    let {
        summary,
        filtersDefinitions: propertyDefinitions = [],
        onConfirm,
        onCancel = () => {},
    }: Props = $props();

    // helpers
    function propLabel(key: string): string {
        const def = propertyDefinitions.find((d) => d.key === key);
        if (def?.label) return def.label;
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (c) => c.toUpperCase());
    }

    function valueLabel(v: unknown): string {
        if (Array.isArray(v)) return v.length === 0 ? "(none)" : v.join(", ");
        if (typeof v === "boolean") return v ? "true" : "false";
        if (v === "" || v === null || v === undefined) return "(empty)";
        return String(v);
    }

    const arrowSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1" y1="5" x2="9" y2="5"/><polyline points="6,2 9,5 6,8"/></svg>`;

    interface PropDiff {
        key: string;
        kind: "added" | "removed" | "changed";
        oldValue?: unknown;
        newValue?: unknown;
    }

    function diffProperties(
        prev: RuleFilter[],
        curr: RuleFilter[],
    ): PropDiff[] {
        const prevMap = new Map(prev.map((p) => [p.key, p.value]));
        const currMap = new Map(curr.map((p) => [p.key, p.value]));
        const result: PropDiff[] = [];

        // removed
        for (const p of prev) {
            if (!currMap.has(p.key))
                result.push({ key: p.key, kind: "removed", oldValue: p.value });
        }
        // added
        for (const p of curr) {
            if (!prevMap.has(p.key))
                result.push({ key: p.key, kind: "added", newValue: p.value });
        }
        // changed
        for (const p of curr) {
            if (
                prevMap.has(p.key) &&
                JSON.stringify(prevMap.get(p.key)) !== JSON.stringify(p.value)
            ) {
                result.push({
                    key: p.key,
                    kind: "changed",
                    oldValue: prevMap.get(p.key),
                    newValue: p.value,
                });
            }
        }
        return result;
    }
</script>

<BaseModal
    title="Save Changes"
    size="large"
    showDefaultFooter={true}
    confirmText="Confirm & Save"
    cancelText="Cancel"
    confirmButtonClass="btn bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
    {onConfirm}
    {onCancel}
>
    <div class="space-y-5 text-sm">
        <!-- ── Summary badges ──────────────────────────────────────────────────── -->
        <div class="flex flex-wrap gap-2">
            {#if summary.added.length > 0}
                <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-success-500"
                    ></span>
                    {summary.added.length} added
                </span>
            {/if}
            {#if summary.removed.length > 0}
                <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-error-500"></span>
                    {summary.removed.length} removed
                </span>
            {/if}
            {#if summary.modified.length > 0}
                <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-warning-500"
                    ></span>
                    {summary.modified.length} modified
                </span>
            {/if}
            {#if summary.reordered}
                <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                >
                    <span class="w-1.5 h-1.5 rounded-full bg-primary-500"
                    ></span>
                    reordered
                </span>
            {/if}
        </div>

        <!-- ── Reorder ──────────────────────────────────────────────────────────── -->
        {#if summary.reordered}
            <section>
                <div class="flex items-center gap-2.5 mb-2.5">
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-500 text-white shrink-0"
                    >
                        <svg
                            width="11"
                            height="11"
                            viewBox="0 0 11 11"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><line x1="2" y1="3" x2="9" y2="3" /><line
                                x1="2"
                                y1="5.5"
                                x2="9"
                                y2="5.5"
                            /><line x1="2" y1="8" x2="9" y2="8" /></svg
                        >
                        Reordered
                    </span>
                    <div
                        class="flex-1 h-px bg-primary-200 dark:bg-primary-800"
                    ></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <!-- Before -->
                    <div>
                        <p
                            class="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-1.5"
                        >
                            Before
                        </p>
                        <div class="space-y-1">
                            {#each summary.previousOrder as entry, i}
                                {@const movedTo =
                                    summary.currentOrder.findIndex(
                                        (r) => r.id === entry.id,
                                    )}
                                {@const moved = movedTo !== i}
                                <div
                                    class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs
                  {moved
                                        ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
                                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}"
                                >
                                    <span
                                        class="font-mono text-[10px] w-4 shrink-0 text-center opacity-60"
                                        title="Priority {i + 1}">{i + 1}</span
                                    >
                                    <span class="truncate font-medium"
                                        >{entry.name}</span
                                    >
                                    {#if moved}
                                        <span
                                            class="ml-auto shrink-0 text-[10px] opacity-70"
                                            >→ #{movedTo + 1}</span
                                        >
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                    <!-- After -->
                    <div>
                        <p
                            class="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-1.5"
                        >
                            After
                        </p>
                        <div class="space-y-1">
                            {#each summary.currentOrder as entry, i}
                                {@const savedPos =
                                    summary.previousOrder.findIndex(
                                        (r) => r.id === entry.id,
                                    )}
                                {@const moved = savedPos !== i}
                                <div
                                    class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs
                  {moved
                                        ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
                                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}"
                                >
                                    <span
                                        class="font-mono text-[10px] w-4 shrink-0 text-center opacity-60"
                                        title="Priority {i + 1}">{i + 1}</span
                                    >
                                    <span class="truncate font-medium"
                                        >{entry.name}</span
                                    >
                                    {#if moved}
                                        <span
                                            class="ml-auto shrink-0 text-[10px] opacity-70"
                                            >was #{savedPos + 1}</span
                                        >
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </section>
        {/if}

        <!-- ── Added ────────────────────────────────────────────────────────────── -->
        {#if summary.added.length > 0}
            <section>
                <div class="flex items-center gap-2.5 mb-2.5">
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-success-500 text-white shrink-0"
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            ><line x1="5" y1="1" x2="5" y2="9" /><line
                                x1="1"
                                y1="5"
                                x2="9"
                                y2="5"
                            /></svg
                        >
                        Added
                    </span>
                    <div
                        class="flex-1 h-px bg-success-200 dark:bg-success-800"
                    ></div>
                </div>
                <div class="space-y-2">
                    {#each summary.added as rule}
                        <div
                            class="rounded-xl border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950/40 px-3 py-2.5"
                        >
                            <div class="flex items-center gap-2 mb-1.5">
                                <span
                                    class="text-success-500 font-bold text-base leading-none"
                                    >+</span
                                >
                                <span
                                    class="font-semibold text-surface-900 dark:text-surface-100"
                                    >{rule.name}</span
                                >
                                <span
                                    class="text-[11px] font-bold {rule.action ===
                                    'ALLOW'
                                        ? 'text-success-600 dark:text-success-400'
                                        : 'text-error-600 dark:text-error-400'}"
                                    >{rule.action}</span
                                >
                                {#if !rule.enabled}<span
                                        class="text-[11px] text-surface-400"
                                        >(disabled)</span
                                    >{/if}
                            </div>
                            {#if rule.filters.length > 0}
                                <div
                                    class="mt-1.5 pt-1.5 border-t border-success-200 dark:border-success-800 space-y-1"
                                >
                                    {#each rule.filters as prop}
                                        <div
                                            class="flex items-center gap-1.5 text-xs min-w-0"
                                        >
                                            <span
                                                class="inline-flex items-center justify-center w-[5.5rem] shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800"
                                                >+ added</span
                                            >
                                            <span
                                                class="shrink-0 font-medium text-surface-700 dark:text-surface-300"
                                                >{propLabel(prop.key)}</span
                                            >
                                            <span
                                                class="text-surface-300 dark:text-surface-600 shrink-0"
                                                >·</span
                                            >
                                            <span
                                                class="font-mono bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 px-1.5 py-0.5 rounded truncate"
                                                >{valueLabel(prop.value)}</span
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p
                                    class="pt-1.5 text-xs text-surface-400 italic"
                                >
                                    No conditions
                                </p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- ── Removed ──────────────────────────────────────────────────────────── -->
        {#if summary.removed.length > 0}
            <section>
                <div class="flex items-center gap-2.5 mb-2.5">
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-error-500 text-white shrink-0"
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            ><line x1="1" y1="5" x2="9" y2="5" /></svg
                        >
                        Removed
                    </span>
                    <div
                        class="flex-1 h-px bg-error-200 dark:bg-error-800"
                    ></div>
                </div>
                <div class="space-y-2">
                    {#each summary.removed as rule}
                        <div
                            class="rounded-xl border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-950/40 px-3 py-2.5 opacity-70"
                        >
                            <div class="flex items-center gap-2 mb-1.5">
                                <span
                                    class="text-error-500 font-bold text-base leading-none"
                                    >−</span
                                >
                                <span
                                    class="font-semibold line-through text-surface-400 dark:text-surface-500"
                                    >{rule.name}</span
                                >
                                <span
                                    class="text-[11px] font-bold text-surface-400 line-through"
                                    >{rule.action}</span
                                >
                            </div>
                            {#if rule.filters.length > 0}
                                <div class="space-y-0.5 pl-5">
                                    {#each rule.filters as prop}
                                        <div
                                            class="flex items-center gap-1.5 text-xs text-surface-400 line-through"
                                        >
                                            <span class="shrink-0">·</span>
                                            <span class="font-medium"
                                                >{propLabel(prop.key)}</span
                                            >
                                            <span>·</span>
                                            <span class="font-mono"
                                                >{valueLabel(prop.value)}</span
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- ── Modified ─────────────────────────────────────────────────────────── -->
        {#if summary.modified.length > 0}
            <section>
                <div class="flex items-center gap-2.5 mb-2.5">
                    <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-warning-500 text-white shrink-0"
                    >
                        <svg
                            width="11"
                            height="11"
                            viewBox="0 0 11 11"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M1.5 9.5l5.5-8 2.5 2.5-5.5 5.5H1.5v-2.5z"
                            /></svg
                        >
                        Modified
                    </span>
                    <div
                        class="flex-1 h-px bg-warning-200 dark:bg-warning-800"
                    ></div>
                </div>
                <div class="space-y-3">
                    {#each summary.modified as mod}
                        {@const propDiffs = mod.changedFields.includes(
                            "filters",
                        )
                            ? diffProperties(
                                  mod.previous.filters,
                                  mod.rule.filters,
                              )
                            : []}
                        <div
                            class="rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950/30 px-3 py-2.5"
                        >
                            <!-- Rule title row -->
                            <div class="flex items-center gap-2 mb-2.5">
                                <span
                                    class="font-semibold text-surface-900 dark:text-surface-100"
                                    >{mod.rule.name}</span
                                >
                                <span
                                    class="font-mono text-[10px] text-surface-400 dark:text-surface-500 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded"
                                    >{mod.rule.id.slice(0, 8)}</span
                                >
                            </div>

                            <div class="space-y-1.5">
                                <!-- Name change -->
                                {#if mod.changedFields.includes("name")}
                                    <div
                                        class="flex items-center gap-2 text-xs"
                                    >
                                        <span
                                            class="w-14 shrink-0 text-surface-500 dark:text-surface-400 font-medium"
                                            >Name</span
                                        >
                                        <span
                                            class="font-medium line-through text-surface-400"
                                            >{mod.previous.name}</span
                                        >
                                        <svg
                                            width="10"
                                            height="10"
                                            viewBox="0 0 10 10"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                            stroke-linecap="round"
                                            class="text-surface-400 shrink-0"
                                            ><line
                                                x1="1"
                                                y1="5"
                                                x2="9"
                                                y2="5"
                                            /><polyline
                                                points="6,2 9,5 6,8"
                                            /></svg
                                        >
                                        <span
                                            class="font-medium text-surface-900 dark:text-surface-100"
                                            >{mod.rule.name}</span
                                        >
                                    </div>
                                {/if}

                                <!-- Action change -->
                                {#if mod.changedFields.includes("action")}
                                    <div
                                        class="flex items-center gap-2 text-xs"
                                    >
                                        <span
                                            class="w-14 shrink-0 text-surface-500 dark:text-surface-400 font-medium"
                                            >Action</span
                                        >
                                        <span
                                            class="font-mono line-through text-surface-400"
                                            >{mod.previous.action}</span
                                        >
                                        <svg
                                            width="10"
                                            height="10"
                                            viewBox="0 0 10 10"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                            stroke-linecap="round"
                                            class="text-surface-400 shrink-0"
                                            ><line
                                                x1="1"
                                                y1="5"
                                                x2="9"
                                                y2="5"
                                            /><polyline
                                                points="6,2 9,5 6,8"
                                            /></svg
                                        >
                                        <span
                                            class="font-mono font-bold {mod.rule
                                                .action === 'ALLOW'
                                                ? 'text-success-600 dark:text-success-400'
                                                : 'text-error-600 dark:text-error-400'}"
                                            >{mod.rule.action}</span
                                        >
                                    </div>
                                {/if}

                                <!-- Enabled change -->
                                {#if mod.changedFields.includes("enabled")}
                                    <div
                                        class="flex items-center gap-2 text-xs"
                                    >
                                        <span
                                            class="w-14 shrink-0 text-surface-500 dark:text-surface-400 font-medium"
                                            >Enabled</span
                                        >
                                        <span
                                            class="line-through text-surface-400"
                                            >{mod.previous.enabled
                                                ? "enabled"
                                                : "disabled"}</span
                                        >
                                        <svg
                                            width="10"
                                            height="10"
                                            viewBox="0 0 10 10"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="1.5"
                                            stroke-linecap="round"
                                            class="text-surface-400 shrink-0"
                                            ><line
                                                x1="1"
                                                y1="5"
                                                x2="9"
                                                y2="5"
                                            /><polyline
                                                points="6,2 9,5 6,8"
                                            /></svg
                                        >
                                        <span class="font-semibold"
                                            >{mod.rule.enabled
                                                ? "enabled"
                                                : "disabled"}</span
                                        >
                                    </div>
                                {/if}

                                <!-- Properties diff -->
                                {#if propDiffs.length > 0}
                                    <div
                                        class="mt-1.5 pt-1.5 border-t border-warning-200 dark:border-warning-800 space-y-1"
                                    >
                                        {#each propDiffs as diff}
                                            <div
                                                class="flex items-center gap-1.5 text-xs min-w-0"
                                            >
                                                <!-- kind badge -->
                                                {#if diff.kind === "added"}
                                                    <span
                                                        class="inline-flex items-center justify-center w-[5.5rem] shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800"
                                                        >+ added</span
                                                    >
                                                {:else if diff.kind === "removed"}
                                                    <span
                                                        class="inline-flex items-center justify-center w-[5.5rem] shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800"
                                                        >− removed</span
                                                    >
                                                {:else}
                                                    <span
                                                        class="inline-flex items-center justify-center w-[5.5rem] shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800"
                                                        >~ changed</span
                                                    >
                                                {/if}

                                                <!-- property label -->
                                                <span
                                                    class="shrink-0 font-medium {diff.kind ===
                                                    'removed'
                                                        ? 'text-surface-400 line-through'
                                                        : 'text-surface-700 dark:text-surface-300'}"
                                                    >{propLabel(diff.key)}</span
                                                >
                                                <span
                                                    class="text-surface-300 dark:text-surface-600 shrink-0"
                                                    >·</span
                                                >

                                                <!-- value(s) -->
                                                {#if diff.kind === "added"}
                                                    <span
                                                        class="font-mono bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 px-1.5 py-0.5 rounded truncate"
                                                        >{valueLabel(
                                                            diff.newValue,
                                                        )}</span
                                                    >
                                                {:else if diff.kind === "removed"}
                                                    <span
                                                        class="font-mono bg-error-100 dark:bg-error-950 text-error-600 dark:text-error-400 px-1.5 py-0.5 rounded line-through truncate"
                                                        >{valueLabel(
                                                            diff.oldValue,
                                                        )}</span
                                                    >
                                                {:else}
                                                    <span
                                                        class="font-mono bg-error-100 dark:bg-error-950 text-error-600 dark:text-error-400 px-1.5 py-0.5 rounded line-through shrink-0 max-w-[30%] truncate"
                                                        >{valueLabel(
                                                            diff.oldValue,
                                                        )}</span
                                                    >
                                                    <svg
                                                        width="10"
                                                        height="10"
                                                        viewBox="0 0 10 10"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="1.5"
                                                        stroke-linecap="round"
                                                        class="text-surface-400 shrink-0"
                                                        ><line
                                                            x1="1"
                                                            y1="5"
                                                            x2="9"
                                                            y2="5"
                                                        /><polyline
                                                            points="6,2 9,5 6,8"
                                                        /></svg
                                                    >
                                                    <span
                                                        class="font-mono bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 px-1.5 py-0.5 rounded truncate"
                                                        >{valueLabel(
                                                            diff.newValue,
                                                        )}</span
                                                    >
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
    </div>
</BaseModal>

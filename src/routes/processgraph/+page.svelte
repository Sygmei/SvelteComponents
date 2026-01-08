<script lang="ts">
    import { ProcessGraph } from '$lib/components/ProcessGraph';
    import type { ProcessGraphData } from '$lib/components/ProcessGraph';
    import { onMount } from 'svelte';
    
    // Import the dataset
    import processData from '$lib/components/ProcessGraph/process_graph_dataset.json';

    const graphData: ProcessGraphData = processData as ProcessGraphData;

    let showMiniMap = $state(true);
    let showControls = $state(true);
    let showStats = $state(true);
    
    // Theme detection
    let isDark = $state(true);
    
    onMount(() => {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            isDark = e.matches;
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    });
</script>

<svelte:head>
    <title>Process Graph - Demo</title>
</svelte:head>

<div class="min-h-screen p-6 transition-colors duration-300 {isDark ? 'bg-slate-950' : 'bg-slate-100'}">
    <div class="mx-auto max-w-7xl">
        <!-- Header -->
        <div class="mb-6">
            <h1 class="text-3xl font-bold mb-2 {isDark ? 'text-white' : 'text-slate-900'}">
                Process Graph Visualization
            </h1>
            <p class={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Interactive DAG visualization for process pipelines using Svelte Flow
            </p>
        </div>

        <!-- Controls -->
        <div class="mb-6 flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors duration-300 {isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}">
            <label class="flex items-center gap-2 text-sm cursor-pointer {isDark ? 'text-white' : 'text-slate-700'}">
                <input type="checkbox" bind:checked={showMiniMap} class="rounded border-white/20 bg-slate-700 text-indigo-500 focus:ring-indigo-500">
                Show MiniMap
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer {isDark ? 'text-white' : 'text-slate-700'}">
                <input type="checkbox" bind:checked={showControls} class="rounded border-white/20 bg-slate-700 text-indigo-500 focus:ring-indigo-500">
                Show Controls
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer {isDark ? 'text-white' : 'text-slate-700'}">
                <input type="checkbox" bind:checked={showStats} class="rounded border-white/20 bg-slate-700 text-indigo-500 focus:ring-indigo-500">
                Show Stats
            </label>
        </div>

        <!-- Graph Container -->
        <div class="h-[700px] rounded-2xl shadow-2xl">
            <ProcessGraph 
                data={graphData}
                {showMiniMap}
                {showControls}
                {showStats}
            />
        </div>

        <!-- Legend -->
        <div class="mt-6 rounded-xl border p-4 transition-colors duration-300 {isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}">
            <h3 class="text-sm font-semibold mb-3 {isDark ? 'text-white' : 'text-slate-900'}">Status Legend</h3>
            <div class="flex flex-wrap gap-4">
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-500 text-xs">✓</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">Success</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-slate-500/20 border border-slate-400 flex items-center justify-center text-slate-500 text-xs">⏭</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">Skipped</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 text-xs">✗</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">Failed</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-500 text-xs">⟳</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">In Progress</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 text-xs">◯</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">Not Started</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="h-4 w-4 rounded-md bg-violet-500/20 border border-violet-500 flex items-center justify-center text-violet-500 text-xs">↺</span>
                    <span class="text-sm {isDark ? 'text-slate-300' : 'text-slate-600'}">Rollbacked</span>
                </div>
            </div>
        </div>

        <!-- Features -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-xl border p-4 transition-colors duration-300 {isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}">
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">🖱️</span>
                    <h3 class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}">Interactive</h3>
                </div>
                <p class="text-sm {isDark ? 'text-slate-400' : 'text-slate-600'}">Pan and zoom to explore the graph. Use the minimap for quick navigation.</p>
            </div>
            <div class="rounded-xl border p-4 transition-colors duration-300 {isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}">
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">🎨</span>
                    <h3 class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}">Status Aware</h3>
                </div>
                <p class="text-sm {isDark ? 'text-slate-400' : 'text-slate-600'}">Nodes are color-coded by status. Running processes show animated edges.</p>
            </div>
            <div class="rounded-xl border p-4 transition-colors duration-300 {isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}">
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">📊</span>
                    <h3 class="font-semibold {isDark ? 'text-white' : 'text-slate-900'}">Auto-Layout</h3>
                </div>
                <p class="text-sm {isDark ? 'text-slate-400' : 'text-slate-600'}">Automatic hierarchical layout based on process dependencies.</p>
            </div>
        </div>
    </div>
</div>
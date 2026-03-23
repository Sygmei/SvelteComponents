<script lang="ts">
  import BaseModal from "$lib/components/Modal/BaseModal.svelte";
  import type { Rule } from "./types.js";

  interface Props {
    rule: Rule;
  }

  let { rule }: Props = $props();

  function formatDate(iso: string | undefined): string {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }
</script>

<BaseModal title="Rule metadata" size="small" showDefaultFooter={true} cancelText="Close">
  <!-- Rule name sub-heading -->
  <div class="flex items-center gap-2 mb-4 pb-3 border-b border-surface-200 dark:border-surface-700">
    <span class="w-7 h-7 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 shrink-0">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="7" cy="7" r="6"/>
        <line x1="7" y1="6" x2="7" y2="10"/>
        <circle cx="7" cy="4" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    </span>
    <span class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{rule.name}</span>
  </div>

  <!-- Metadata rows -->
  <div class="flex flex-col gap-3">
    {@render metaRow("Created by", rule.metadata?.createdBy, "person")}
    {@render metaRow("Updated by", rule.metadata?.updatedBy, "person")}
    {@render metaRow("Created at", formatDate(rule.metadata?.createdAt), "clock")}
    {@render metaRow("Updated at", formatDate(rule.metadata?.updatedAt), "clock")}
  </div>
</BaseModal>

{#snippet metaRow(label: string, value: string | undefined, icon: "person" | "clock")}
  <div class="flex items-start gap-3">
    <span class="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 mt-0.5">
      {#if icon === "person"}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="4" r="2.5"/>
          <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5"/>
        </svg>
      {:else}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="5"/>
          <polyline points="6,3 6,6 8.5,6"/>
        </svg>
      {/if}
    </span>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="text-[11px] font-medium text-surface-400 dark:text-surface-500 leading-none">{label}</span>
      <span class="text-sm leading-snug {!value || value === '—' ? 'italic text-surface-400 dark:text-surface-600' : 'text-surface-800 dark:text-surface-200'}">
        {value ?? "—"}
      </span>
    </div>
  </div>
{/snippet}

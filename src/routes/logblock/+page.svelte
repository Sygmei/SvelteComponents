<script lang="ts">
  import { LogBlock, airflowLogProvider } from "$lib/components/LogBlock";
  import type { LogProvider } from "$lib/components/LogBlock";
  import airflowLogSample from "../../../airflow_log_example.txt?raw";

  const customProvider: LogProvider = {
    parseLine: (line: string) => {
      const parsed = line.match(/^(?<date>[^|]+)\|(?<level>[^|]+)\|(?<message>.*)$/);

      if (!parsed?.groups) {
        return {
          type: "line",
          line: {
            raw: line,
            message: line,
          },
        };
      }

      return {
        type: "line",
        line: {
          raw: line,
          timestamp: parsed.groups.date,
          level: parsed.groups.level,
          message: parsed.groups.message,
        },
      };
    },
    normalizeLevel: (level: string) => level.toUpperCase(),
    levelOrder: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"],
  };

  const customLogSample = [
    "2026-02-19T09:01:00Z|INFO|Starting custom provider",
    "2026-02-19T09:01:03Z|WARN|Slow endpoint detected",
    "2026-02-19T09:01:10Z|ERROR|Request failed. See https://status.example.com/incidents/123",
  ].join("\n");

  let selectedAirflowLevels = $state<string[]>([]);
</script>

<svelte:head>
  <title>LogBlock Demo</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-6xl space-y-8">
  <header class="space-y-2">
    <h1 class="text-3xl font-bold text-surface-100">LogBlock</h1>
    <p class="text-surface-300">
      Date/loglevel highlighting, level filters, group handling, and automatic links.
    </p>
  </header>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-surface-100">Airflow Provider Example</h2>
    <LogBlock
      logs={airflowLogSample}
      provider={airflowLogProvider}
      bind:selectedLevels={selectedAirflowLevels}
      title="Airflow Task Logs"
    />
    <p class="text-xs text-surface-400">
      Active levels: {selectedAirflowLevels.length === 0
        ? "All"
        : selectedAirflowLevels.join(", ")}
    </p>
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold text-surface-100">Custom Provider Example</h2>
    <LogBlock
      logs={customLogSample}
      provider={customProvider}
      title="Pipe-Delimited Logs"
      initialGroupsCollapsed={false}
    />
  </section>
</div>

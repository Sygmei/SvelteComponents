<script lang="ts">
    interface Props {
        value: string; // RFC3339 string
        onchange: (rfc3339: string) => void;
        inputClass?: string;
    }

    let { value, onchange, inputClass = "" }: Props = $props();

    // ── timezone offset options ───────────────────────────────────────────────
    const TZ_OFFSETS: { label: string; value: string }[] = [
        { label: "UTC-12:00", value: "-12:00" },
        { label: "UTC-11:00", value: "-11:00" },
        { label: "UTC-10:00", value: "-10:00" },
        { label: "UTC-09:00", value: "-09:00" },
        { label: "UTC-08:00", value: "-08:00" },
        { label: "UTC-07:00", value: "-07:00" },
        { label: "UTC-06:00", value: "-06:00" },
        { label: "UTC-05:00", value: "-05:00" },
        { label: "UTC-04:00", value: "-04:00" },
        { label: "UTC-03:30", value: "-03:30" },
        { label: "UTC-03:00", value: "-03:00" },
        { label: "UTC-02:00", value: "-02:00" },
        { label: "UTC-01:00", value: "-01:00" },
        { label: "UTC+00:00", value: "+00:00" },
        { label: "UTC+01:00", value: "+01:00" },
        { label: "UTC+02:00", value: "+02:00" },
        { label: "UTC+03:00", value: "+03:00" },
        { label: "UTC+03:30", value: "+03:30" },
        { label: "UTC+04:00", value: "+04:00" },
        { label: "UTC+04:30", value: "+04:30" },
        { label: "UTC+05:00", value: "+05:00" },
        { label: "UTC+05:30", value: "+05:30" },
        { label: "UTC+05:45", value: "+05:45" },
        { label: "UTC+06:00", value: "+06:00" },
        { label: "UTC+06:30", value: "+06:30" },
        { label: "UTC+07:00", value: "+07:00" },
        { label: "UTC+08:00", value: "+08:00" },
        { label: "UTC+09:00", value: "+09:00" },
        { label: "UTC+09:30", value: "+09:30" },
        { label: "UTC+10:00", value: "+10:00" },
        { label: "UTC+10:30", value: "+10:30" },
        { label: "UTC+11:00", value: "+11:00" },
        { label: "UTC+12:00", value: "+12:00" },
        { label: "UTC+13:00", value: "+13:00" },
        { label: "UTC+14:00", value: "+14:00" },
    ];

    // ── detect local UTC offset as ±HH:MM string ─────────────────────────────
    function localOffsetString(): string {
        const offsetMin = -new Date().getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const abs = Math.abs(offsetMin);
        const hh = String(Math.floor(abs / 60)).padStart(2, "0");
        const mm = String(abs % 60).padStart(2, "0");
        return `${sign}${hh}:${mm}`;
    }

    // ── parse incoming RFC3339 value ──────────────────────────────────────────
    // Accepted: "2024-01-01T13:00:00+01:00" or empty
    function parseRfc3339(v: string): { local: string; tz: string } {
        const match = v.match(
            /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)?$/,
        );
        if (!match) return { local: "", tz: localOffsetString() };
        const datePart = match[1];
        const timePart = match[2];
        const tzPart =
            match[3] === "Z" ? "+00:00" : (match[3] ?? localOffsetString());
        return { local: `${datePart}T${timePart}`, tz: tzPart };
    }

    let localDt = $state(parseRfc3339(value).local);
    let tzOffset = $state(parseRfc3339(value).tz);

    // keep in sync when external value changes
    $effect(() => {
        const p = parseRfc3339(value);
        localDt = p.local;
        tzOffset = p.tz;
    });

    function emit() {
        if (!localDt) return;
        // datetime-local gives YYYY-MM-DDTHH:MM – add :00 seconds
        const withSeconds = localDt.length === 16 ? `${localDt}:00` : localDt;
        onchange(`${withSeconds}${tzOffset}`);
    }

    const selectClass =
        "text-xs rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition-colors shrink-0";
</script>

<div class="flex items-center gap-1.5 w-full">
    <input
        type="datetime-local"
        bind:value={localDt}
        oninput={emit}
        class="{inputClass} flex-1 min-w-0"
    />
    <select
        bind:value={tzOffset}
        onchange={emit}
        class={selectClass}
        title="Timezone offset"
    >
        {#each TZ_OFFSETS as tz}
            <option value={tz.value}>{tz.label}</option>
        {/each}
    </select>
</div>

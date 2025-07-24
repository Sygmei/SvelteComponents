<script>
	let {
		fields = ['name', 'type', 'status', 'category'],
		comparators = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith'],
		fieldComparators = {},
		fetchValues = async (field, query) => {
			await new Promise(resolve => setTimeout(resolve, 300));
			const mockValues = {
				name: ['test', 'example', 'demo', 'sample'],
				type: ['route', 'component', 'service', 'util'],
				status: ['active', 'inactive', 'pending', 'completed'],
				category: ['frontend', 'backend', 'database', 'api']
			};
			return (mockValues[field] || []).filter(v => 
				v.toLowerCase().includes(query.toLowerCase())
			);
		},
		onFiltersChange = () => {}
	} = $props();

	let inputValue = $state('');
	let filters = $state([]);
	let showSuggestions = $state(false);
	let suggestions = $state([]);
	let currentPart = $state('field');
	let selectedIndex = $state(0);
	let inputElement;

	let currentField = $state('');
	let currentComparator = $state('');
	let debounceTimer;

	function debouncedUpdateSuggestions() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(updateSuggestions, 100);
	}

	async function updateSuggestions() {
		if (!inputValue.trim()) {
			showSuggestions = false;
			return;
		}

		const parts = inputValue.split(/\s+/);
		
		if (parts.length === 1) {
			currentPart = 'field';
			suggestions = fields.filter(f => 
				f.toLowerCase().includes(parts[0].toLowerCase())
			);
		} else if (parts.length === 2) {
			currentPart = 'comparator';
			currentField = parts[0];
			const availableComparators = fieldComparators[currentField] || comparators;
			suggestions = availableComparators.filter(c => 
				c.toLowerCase().includes(parts[1].toLowerCase())
			);
		} else if (parts.length >= 3) {
			currentPart = 'value';
			currentField = parts[0];
			currentComparator = parts[1];
			const query = parts.slice(2).join(' ');
			
			try {
				const values = await fetchValues(currentField, query);
				suggestions = values;
			} catch (error) {
				suggestions = [];
			}
		}

		showSuggestions = suggestions.length > 0;
		selectedIndex = 0;
	}

	function selectSuggestion(suggestion) {
		const parts = inputValue.split(/\s+/);
		
		if (currentPart === 'field') {
			inputValue = suggestion + ' ';
		} else if (currentPart === 'comparator') {
			inputValue = parts[0] + ' ' + suggestion + ' ';
		} else if (currentPart === 'value') {
			inputValue = parts[0] + ' ' + parts[1] + ' ' + suggestion;
		}
		
		showSuggestions = false;
		inputElement?.focus();
	}

	function handleKeydown(event) {
		if (!showSuggestions) {
			if (event.key === 'Enter' && inputValue.trim()) {
				addFilter();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = (selectedIndex + 1) % suggestions.length;
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				event.preventDefault();
				
				// Check if current input already matches what would be completed
				const parts = inputValue.split(/\s+/);
				let shouldAddFilter = false;
				
				if (currentPart === 'value' && parts.length >= 3) {
					// For values, check if the current value exactly matches the selected suggestion
					const currentValue = parts.slice(2).join(' ');
					if (suggestions[selectedIndex] && currentValue === suggestions[selectedIndex]) {
						shouldAddFilter = true;
					}
				} else if (currentPart === 'field' && suggestions.includes(parts[0])) {
					// For fields, if current input exactly matches a suggestion, don't auto-complete
					shouldAddFilter = false;
				} else if (currentPart === 'comparator' && suggestions.includes(parts[1])) {
					// For comparators, if current input exactly matches a suggestion, don't auto-complete
					shouldAddFilter = false;
				}
				
				if (shouldAddFilter && inputValue.trim()) {
					addFilter();
				} else if (suggestions[selectedIndex]) {
					selectSuggestion(suggestions[selectedIndex]);
					setTimeout(updateSuggestions, 0);
				} else if (inputValue.trim()) {
					addFilter();
				}
				break;
			case 'Escape':
				showSuggestions = false;
				break;
		}
	}

	function addFilter() {
		const parts = inputValue.trim().split(/\s+/);
		
		if (parts.length >= 3) {
			// Standard field comparator value format
			const field = parts[0];
			const comparator = parts[1];
			const value = parts.slice(2).join(' ');
			
			const newFilter = { field, comparator, value, id: Date.now() };
			filters = [...filters, newFilter];
			inputValue = '';
			showSuggestions = false;
			onFiltersChange(filters);
		} else if (parts.length === 1 && !fields.includes(parts[0])) {
			// Single unrecognized term - treat as value-only filter
			const value = parts[0];
			
			const newFilter = { value, id: Date.now() };
			filters = [...filters, newFilter];
			inputValue = '';
			showSuggestions = false;
			onFiltersChange(filters);
		}
	}

	function removeFilter(id) {
		filters = filters.filter(f => f.id !== id);
		onFiltersChange(filters);
	}

</script>

<div class="relative w-full max-w-2xl">
	<div class="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-white min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
		{#each filters as filter (filter.id)}
			<div class="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
				{#if filter.field && filter.comparator}
					<!-- Standard field comparator value filter -->
					<span class="font-medium">{filter.field}</span>
					<span class="text-blue-600">{filter.comparator}</span>
					<span>{filter.value}</span>
				{:else}
					<!-- Value-only filter -->
					<span class="font-medium">{filter.value}</span>
				{/if}
				<button
					type="button"
					onclick={() => removeFilter(filter.id)}
					class="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
				>
					×
				</button>
			</div>
		{/each}
		
		<input
			bind:this={inputElement}
			bind:value={inputValue}
			onkeydown={handleKeydown}
			oninput={debouncedUpdateSuggestions}
			onfocus={() => updateSuggestions()}
			placeholder={filters.length === 0 ? "Enter filter (e.g., name == test)" : ""}
			class="flex-1 min-w-0 outline-none bg-transparent text-sm"
		/>
	</div>

	{#if showSuggestions}
		<div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
			{#each suggestions as suggestion, index}
				<button
					type="button"
					onclick={() => selectSuggestion(suggestion)}
					class="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm {index === selectedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}"
				>
					{#if currentPart === 'field'}
						<span class="font-medium text-blue-600">{suggestion}</span>
						<span class="text-gray-400 ml-2">field</span>
					{:else if currentPart === 'comparator'}
						<span class="text-gray-600">{currentField}</span>
						<span class="font-medium text-blue-600 mx-2">{suggestion}</span>
						<span class="text-gray-400">comparator</span>
					{:else}
						<span class="text-gray-600">{currentField} {currentComparator}</span>
						<span class="font-medium text-blue-600 ml-2">{suggestion}</span>
						<span class="text-gray-400 ml-2">value</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
<script>
	import FilterInputBox from '$lib/FilterInputBox.svelte';

	let currentFilters = $state([]);

	const customFields = ['name', 'email', 'role', 'department', 'status'];
	const customComparators = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith', 'in'];
	
	const customFieldComparators = {
		name: ['==', '!=', 'contains', 'startsWith', 'endsWith'],
		email: ['==', '!=', 'contains', 'endsWith'],
		role: ['==', '!=', 'in'],
		department: ['==', '!=', 'in'],
		status: ['==', '!=']
	};

	async function fetchCustomValues(field, query) {
		await new Promise(resolve => setTimeout(resolve, 200));
		
		const mockData = {
			name: ['john.doe', 'jane.smith', 'alice.johnson', 'bob.wilson', 'carol.brown'],
			email: ['john@example.com', 'jane@company.co', 'alice@test.org', 'bob@demo.net'],
			role: ['admin', 'user', 'moderator', 'guest', 'developer'],
			department: ['engineering', 'marketing', 'sales', 'hr', 'finance'],
			status: ['active', 'inactive', 'pending', 'suspended', 'archived']
		};

		return (mockData[field] || []).filter(value =>
			value.toLowerCase().includes(query.toLowerCase())
		);
	}

	function handleFiltersChange(filters) {
		currentFilters = filters;
	}
</script>

<svelte:head>
	<title>Filter Input Box Demo</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<h1 class="text-3xl font-bold text-gray-900 mb-8">Filter Input Box Demo</h1>
		
		<div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
			<h2 class="text-lg font-semibold text-gray-800 mb-4">Try the Filter Input Box</h2>
			<p class="text-gray-600 mb-4">
				Type to create filters like: <code class="bg-gray-100 px-2 py-1 rounded">name == john</code> or <code class="bg-gray-100 px-2 py-1 rounded">status != inactive</code>
			</p>
			
			<FilterInputBox
				fields={customFields}
				comparators={customComparators}
				fieldComparators={customFieldComparators}
				fetchValues={fetchCustomValues}
				onFiltersChange={handleFiltersChange}
			/>
		</div>

		<div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">Current Filters ({currentFilters.length})</h3>
			{#if currentFilters.length === 0}
				<p class="text-gray-500 italic">No filters applied</p>
			{:else}
				<div class="space-y-2">
					{#each currentFilters as filter}
						<div class="flex items-center gap-3 p-3 bg-gray-50 rounded border">
							<span class="font-medium text-blue-600">{filter.field}</span>
							<span class="text-gray-600">{filter.comparator}</span>
							<span class="font-medium">{filter.value}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">Features</h3>
			<ul class="space-y-2 text-gray-600">
				<li class="flex items-center gap-2">
					<span class="text-green-500">✓</span>
					Auto-completion for fields, comparators, and values
				</li>
				<li class="flex items-center gap-2">
					<span class="text-green-500">✓</span>
					Navigate suggestions with arrow keys
				</li>
				<li class="flex items-center gap-2">
					<span class="text-green-500">✓</span>
					Press Enter to add filters as removable tags
				</li>
				<li class="flex items-center gap-2">
					<span class="text-green-500">✓</span>
					Dynamic value fetching based on field selection
				</li>
				<li class="flex items-center gap-2">
					<span class="text-green-500">✓</span>
					Click X on tags to remove filters
				</li>
			</ul>
		</div>
	</div>
</div>
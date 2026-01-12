<script>
	import "../app.css";
	import ModalStore from "$lib/components/Modal/ModalStore.svelte";
</script>

<div class="h-full overflow-hidden">
	<slot />
</div>

<ModalStore />

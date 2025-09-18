<script lang="ts">
    import { modalStoreActiveModal } from './modalStore.js';
</script>

{#if modalStoreActiveModal}
    {@const CurrentModalComponent = modalStoreActiveModal.modal}
    <CurrentModalComponent {...modalStoreActiveModal.props} />
{/if}

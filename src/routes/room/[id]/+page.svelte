<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import { createClipboardStore } from '$lib/clipboard';

  let roomId = '';
  let clipboard = '';

  roomId = $page.params.id!;

  const clipboardStore = createClipboardStore(roomId);

  const unsubscribe = clipboardStore.subscribe((value) => {
    clipboard = value;
  });

  onDestroy(() => {
    clipboardStore.unsubscribe();
    unsubscribe();
  });

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    clipboardStore.updateClipboard(target.value);
  };
</script>

<h1>Room: {roomId}</h1>
<textarea bind:value={clipboard} on:input={handleInput} rows="10" cols="50"></textarea>

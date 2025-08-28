<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import { createClipboardStore } from '$lib/clipboard';

  let roomId = $page.params.id;
  let clipboard = '';

  const clipboardStore = createClipboardStore(roomId);

  const unsubscribe = clipboardStore.subscribe((value) => {
    clipboard = value;
  });

  onDestroy(() => {
    unsubscribe();
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    clipboardStore.updateClipboard(target.value);
  }
</script>

<h2 class="text-2xl font-bold text-gray-700 text-center mb-4">
  Room: {roomId}
</h2>

<textarea
  bind:value={clipboard}
  on:input={handleInput}
  rows="10"
  class="w-full rounded-xl border p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
  placeholder="Type or paste to share clipboard..."
></textarea>

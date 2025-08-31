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

  async function destroy() {
    if (confirm('Are you sure you want to destroy this room? This will remove it for everyone.')) {
      await clipboardStore.destroyRoom();
    }
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


<button
class="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
on:click={destroy}
>
Destroy Room
</button>

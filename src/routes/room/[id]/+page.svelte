<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import { createClipboardStore } from '$lib/clipboard';
  import QRCode from 'qrcode';

  let roomId = $page.params.id;
  let clipboard = '';
  let qrCodeUrl = '';

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
    if (
      confirm(
        '⚠️ Are you sure you want to destroy this room?\n\nThis will remove it for EVERYONE and cannot be undone.'
      )
    ) {
      await clipboardStore.destroyRoom();
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(clipboard);
      alert('✅ Copied to clipboard');
    } catch {
      alert('❌ Failed to copy');
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      clipboard = text;
      clipboardStore.updateClipboard(text);
    } catch {
      alert('❌ Failed to paste');
    }
  }

  // Generate QR code for the room link
  onMount(() => {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    QRCode.toDataURL(roomUrl, { width: 200, margin: 1 }).then((url) => {
      qrCodeUrl = url;
    });
  });
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow">
  <h2 class="text-3xl font-bold text-gray-800 text-center">
    Room <span class="text-indigo-600">#{roomId}</span>
  </h2>

  <!-- QR Code -->
  {#if qrCodeUrl}
    <div class="flex justify-center">
      <img src={qrCodeUrl} alt="QR Code for room" class="rounded-xl shadow border p-2 bg-white" />
    </div>
    <p class="text-sm text-gray-500 text-center">Scan to join this room</p>
  {/if}

  <textarea
    bind:value={clipboard}
    on:input={handleInput}
    rows="10"
    class="w-full rounded-xl border border-gray-300 p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none"
    placeholder="Type or paste to share clipboard..."
  ></textarea>

  <!-- Copy/Paste buttons -->
  <div class="flex gap-4">
    <button
      class="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-medium shadow hover:bg-gray-200 active:scale-95 transition"
      on:click={copyToClipboard}
    >
      📋 Copy
    </button>
    <button
      class="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-medium shadow hover:bg-gray-200 active:scale-95 transition"
      on:click={pasteFromClipboard}
    >
      📥 Paste
    </button>
  </div>

  <!-- Destroy button -->
  <button
    class="w-full px-6 py-3 rounded-xl bg-red-500 text-white font-semibold shadow hover:bg-red-600 active:scale-95 transition"
    on:click={destroy}
  >
    🗑 Destroy Room
  </button>

  <p class="text-sm text-gray-500 text-center">
    Destroying this room will permanently delete its shared clipboard for everyone.
  </p>
</div>

<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import { createClipboardStore } from '$lib/clipboard';
  import QRCode from 'qrcode';

  let roomUrl = '';
  let roomId = $page.params.id;
  let clipboard = '';
  let qrCodeUrl = '';
  let copied = false;
  let removeCopyMessageTimeOut: NodeJS.Timeout | undefined;

  const clipboardStore = createClipboardStore(roomId);

  const unsubscribe = clipboardStore.subscribe((value) => {
    clipboard = value;
  });

  onDestroy(() => {
    unsubscribe();
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    updateClipBoardInternal(target.value);
  }

  function updateClipBoardInternal(val: string): void {
    copied = false;
    removeCopyMessageTimeOut?.close();
    clipboardStore.updateClipboard(val);
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
      copied = true;
      removeCopyMessageTimeOut = setTimeout(() => (copied = false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        clipboard = text;
        updateClipBoardInternal(text);
      }
    } catch (err) {
      // Only log in console for debugging — don't show an alert
      console.warn('Clipboard paste failed or was cancelled', err);
    }
  }

  // Generate QR code for the room link
  onMount(() => {
    roomUrl = `${window.location.origin}/room/${roomId}`;
    QRCode.toDataURL(roomUrl, { width: 200, margin: 1 }).then((url) => {
      qrCodeUrl = url;
    });
  });

  async function shareRoom() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my clipboard room',
          text: `Here’s the link to room ${roomId}`,
          url: roomUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or failed', err);
      }
    } else {
      // fallback: copy link instead
      await navigator.clipboard.writeText(roomUrl);
      alert('🔗 Link copied to clipboard!');
    }
  }
</script>

<div class="mx-auto p-6 space-y-6">
  <button
    type="button"
    class="text-3xl font-bold text-gray-800 text-center w-full cursor-pointer hover:text-indigo-600 transition"
    on:click={shareRoom}
  >
    Room <span class="text-indigo-600">#{roomId}</span> 🔗
  </button>

  <!-- QR Code -->
  {#if qrCodeUrl}
    <div class="flex justify-center">
      <img src={qrCodeUrl} alt="QR Code for room" class="rounded-xl shadow border p-2 bg-white" />
    </div>
    <p class="text-sm text-gray-500 text-center">Share code or scan to join this room</p>
  {/if}

  <textarea
    bind:value={clipboard}
    on:input={handleInput}
    rows="10"
    class="w-full rounded-xl border p-4 text-gray-800 shadow-inner resize-none transition focus:outline-none focus:ring-2 focus:ring-indigo-500 
      {copied ? 'border-green-500 ring-2 ring-green-400' : 'border-gray-300'}"
    placeholder="Type or paste to share clipboard..."
  ></textarea>

  <!-- Copy/Paste buttons -->
  <div class="flex gap-4">
    <button
      class="flex-1 px-4 py-2 rounded-xl font-medium shadow active:scale-95 transition
        {copied 
          ? 'bg-green-500 text-white hover:bg-green-600' 
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}"
      on:click={copyToClipboard}
    >
      {#if copied}
        ✅ Copied!
      {:else}
        📋 Copy
      {/if}
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



<style>
  @keyframes fade-in-out {
    0% { opacity: 0; transform: translateY(10px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-10px); }
  }
  .animate-fade-in-out {
    animation: fade-in-out 5s ease-in-out forwards;
  }
</style>
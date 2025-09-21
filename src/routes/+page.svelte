<script lang="ts">
  import { goto } from '$app/navigation';
  let roomId = '';

  function createRoom() {
    const id = crypto.randomUUID();
    goto(`/room/${id}`);
  }

  function joinRoom() {
    if (roomId.trim()) goto(`/room/${roomId.trim()}`);
  }
</script>

<h1 class="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-8">
  Paste Pal 📋
</h1>

<p class="text-gray-600 text-center max-w-md mx-auto mb-8">
  Create a new shared clipboard and send the link or ID to your friends. 
  Anything you type or paste will instantly sync across.
</p>

<div class="flex flex-col items-center gap-4">
  <button
    class="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 active:scale-[0.98] transition"
    on:click={createRoom}
  >
    Create Clipboard
  </button>

  <div class="flex w-full gap-2">
    <input
      class="flex-1 border rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      bind:value={roomId}
      placeholder="Enter Clipboard ID"
    />
    <button
      class="px-5 py-3 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-[0.98] transition"
      on:click={joinRoom}
    >
      Join
    </button>
  </div>
</div>

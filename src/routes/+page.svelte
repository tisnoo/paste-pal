<script lang="ts">
  import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
  let roomId = '';

  function generateRoomId(length = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => chars[x % chars.length]).join('');
  }

  function createRoom() {
    goto(`/room/${generateRoomId()}`);
  }

  async function joinRoom() {
    const trimmed = roomId.trim();

    // Lookup room, make sure it exists
    const {count} = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('id', trimmed)

    if (!count) {
      alert('Room not found');
      return;
    }

    if (roomId.trim()) {
      goto(`/room/${trimmed}`);
    }
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

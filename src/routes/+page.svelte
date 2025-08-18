<script lang="ts">
  import { goto } from '$app/navigation';
  let roomId = '';

  function createRoom() {
    const id = crypto.randomUUID().slice(0, 6);
    goto(`/room/${id}`);
  }

  function joinRoom() {
    if (roomId.trim()) goto(`/room/${roomId.trim()}`);
  }
</script>

<div class="flex flex-col items-center gap-4 p-10">
  <h1 class="text-3xl font-bold">Clipboard Share</h1>

  <button on:click={createRoom} class="p-2 bg-blue-600 text-white rounded">
    Create Room
  </button>

  <div class="flex gap-2">
    <input
      bind:value={roomId}
      placeholder="Enter Room ID"
      class="border p-2 rounded"
      />
    <button on:click={joinRoom} class="p-2 bg-green-600 text-white rounded">
      Join Room
    </button>
  </div>
</div>

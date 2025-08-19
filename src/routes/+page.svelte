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
  <button class="px-3 py-2 rounded bg-blue-600 text-white" on:click={createRoom}>Create Room</button>
  <div class="flex gap-2">
    <input class="border rounded p-2" bind:value={roomId} placeholder="Enter Room ID" />
    <button class="px-3 py-2 rounded bg-green-600 text-white" on:click={joinRoom}>Join Room</button>
  </div>
</div>

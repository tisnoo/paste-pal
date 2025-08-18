<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { connectToRoom, type ServerMsg } from '$lib/ws';

  let text = '';
  let conn: ReturnType<typeof connectToRoom> | null = null;

  onMount(() => {
    const roomId = $page.params.id as string;

    conn = connectToRoom(roomId, (data: ServerMsg) => {
      if (data.type === 'clipboard') text = data.text;
    });

    return () => {
      conn?.close();
    };
  });

  function onInput() {
    conn?.sendClipboard(text);
  }
</script>

<div class="flex flex-col items-center gap-4 p-10">
  <h2 class="text-xl">Room: {$page.params.id}</h2>
  <textarea
    bind:value={text}
    on:input={onInput}
    class="w-[32rem] h-64 border p-2 rounded"
  />
</div>

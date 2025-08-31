import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

export const createClipboardStore = (roomId: string) => {
  const { subscribe, set } = writable('');

  supabase
    .from('room_clipboard')
    .select('content')
    .eq('room_id', roomId)
    .single()
    .then(({data}) => {
      if (data) {
        set(data.content);
      }
    });


    let latestVersion = -1;

    const subscription = supabase.channel(`room:${roomId}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_clipboard', filter: `room_id=eq.${roomId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          leaveRoom();
          runIfOnBrowser(() => alert('This room has been closed.'));
          return;
        }

        const row = payload.new;
        if (row.version > latestVersion) {
          latestVersion = row.version;
          set(row.content);
        }
      }
    ).subscribe();

  const updateClipboard = async (newContent: string) => {
    const {error} = await supabase
      .from('room_clipboard')
      .upsert({room_id: roomId, content: newContent, version: latestVersion++})
      .select()
      .single();

    if (error) console.error('Supabase update error:', error);
  };

  const leaveRoom = () => {
    supabase.removeChannel(subscription);
    runIfOnBrowser(() => goto('/'));
  };

  const destroyRoom = async () => {
    await supabase
      .from('room_clipboard')
      .delete()
      .eq('room_id', roomId);
    leaveRoom();
  };

  function runIfOnBrowser(runnable: () => void): void {
    if (!browser) {
      return;
    }

    return runnable();
  }

  return {
    subscribe,
    updateClipboard,
    unsubscribe: () => supabase.removeChannel(subscription),
    destroyRoom,
  };
};

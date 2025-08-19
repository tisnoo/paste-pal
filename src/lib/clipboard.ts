import { writable } from 'svelte/store';
import { supabase } from './supabase';

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
      ({ new: row }) => {
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

  return {
    subscribe,
    updateClipboard,
    unsubscribe: () => supabase.removeChannel(subscription),
  };
};

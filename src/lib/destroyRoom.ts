import { supabase } from "./supabase"

/*
 * Destroy `rooms` document inside of Supabase. Will cascade to all tables with room as foreign key using POSTGRESS
 * (managed outside of application)
 **/
export const destroyRoom = async (roomId: string): Promise<void> => {
  await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)
    .limit(1);
}
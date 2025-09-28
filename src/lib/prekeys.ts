import { supabase } from "./supabase";
import type { Database } from "./types/supabase";

export async function prekeys(roomId: string, bundle: any): Promise<void> {
  const { identityKey, signedPreKey, registrationId, preKeys, clientId } = bundle;

  await supabase.from('prekey_bundles').upsert({
    room_id: roomId,
    identity_key: identityKey,
    signed_prekey_id: signedPreKey.id,
    signed_prekey_pub: signedPreKey.pubKey,
    signed_prekey_sig: signedPreKey.signature,
    registration_id: registrationId,
    client_id: clientId,
  });

  const rows: Database['public']['Tables']['one_time_prekeys']['Row'] = preKeys.map(pk => ({
    room_id: roomId,
    client_id: clientId,
    id: pk.id,
    pub: pk.pubKey,
  }));

  await supabase.from('one_time_prekeys').insert(rows);
}
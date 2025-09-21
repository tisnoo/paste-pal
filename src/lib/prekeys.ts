import { supabase } from "./supabase";

export async function prekeys(roomId: string, bundle: any): Promise<void> {
  const { identityKey, signedPreKey, registrationId, preKeys } = bundle;

  await supabase.from('prekey_bundles').upsert({
    room_id: roomId,
    identity_key: identityKey,
    signed_prekey_id: signedPreKey.id,
    signed_prekey_pub: signedPreKey.pubKey,
    signed_prekey_sig: signedPreKey.signature,
    registration_id: registrationId,
  });

  const rows = preKeys.map(pk => ({
    room_id: roomId,
    id: pk.id,
    pub: pk.pubKey,
  }));

  await supabase.from('one_time_prekeys').insert(rows);
}
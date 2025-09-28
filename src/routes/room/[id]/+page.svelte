<script lang="ts">
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import QRCode from 'qrcode';
  import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';
  import { createSignalStore, type SignalStore } from '$lib/signalStore';
  import { toBase64, fromBase64, u8FromStr, strFromU8, toArrayBuffer, toBase64FromStr } from '$lib/encoding';
  import { KeyHelper, SessionBuilder, SessionCipher } from '@privacyresearch/libsignal-protocol-typescript';
	import { supabase } from '$lib/supabase';
	import { prekeys } from '$lib/prekeys';
	import type { Database } from '$lib/types/supabase';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { destroyRoom } from '$lib/destroyRoom';

  const maxRoomSize = 5;

  let roomId = $page.params.id!;
  let clipboard = '';
  /**
   * Date of latest clipboard event. Clipboard should only be updated if after latest clipboard event date.
   */
  let latestClipboardEventDate: Date | undefined;

  let qrCodeUrl = '';
  let copied = false;
  let removeCopyMessageTimeOut: NodeJS.Timeout | undefined;
  let actionTimeOut: NodeJS.Timeout | undefined;

  // E2EE state
  let store: SignalStore;
  let room: Database['public']['Tables']['rooms']['Row'] | null;
  let clientId: string;
  let clientSessions = new Map<string, SessionCipher>(); // host only
  let messagesSub: RealtimeChannel | undefined;
  let roomSub: RealtimeChannel | undefined;

  onDestroy(() => {
    messagesSub?.unsubscribe();
    roomSub?.unsubscribe();
  });

  onMount(async () => {
    store = createSignalStore(roomId);

    // QR code
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    QRCode.toDataURL(roomUrl, { width: 200, margin: 1 }).then((url: any) => qrCodeUrl = url);

    // Generate or retrieve client id
    clientId = await store.get('client-id') || crypto.randomUUID();
    await store.put('client-id', clientId);

    // Determine host vs client
    const {data: roomData, error} = await supabase.from('rooms').select('*').eq('id', roomId).single();

    // Navigate to home on error
    if (error?.code === '22P02' && browser) {
      goto('/');
      alert('Invalid room code');
    }

    room = roomData;

    if (!room) {
      room = (await supabase.from('rooms').insert({ id: roomId, host_id: clientId }).select('*').single()).data!;
    }

    await setupClient();
    await connectWithRoomClients();

    // Request message from all clients, we don't know which clients are on-line to send it.
    await broadcastRaw('request clipboard');

    subscribeMessages();
    subscribeToRoomDeletion();
  });

  /**
   * Initializes client for a room:
   * - Ensures the host has a client identity key pair and registration ID.
   * - Loads or generates a signed pre-key.
   * - Generates one-time pre-keys for client consumption.
   * - Uploads the client's pre-key bundle to the server for clients to establish sessions.
   */
  async function setupClient(): Promise<void> {
    // Ensure persistent identity key pair and registration ID
    const {identityKeyPair, registrationId} = await ensureIdentityAndRegistration();

    // fixed id for deterministic storage
    const signedPreKeyId = 1;

    // If pre-key already exists, restore clipboard and exit early
    if (await store.loadSignedPreKey(signedPreKeyId)) {
      return;
    }

    // Retrieve current participant count by retrieving amount of bundles already existing.
    const {count} = await supabase
      .from('prekey_bundles')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .neq('client_id', clientId);

    if ((count ?? 0) >= maxRoomSize) {
      goto('/');
      alert('Max client size has been reached for this room.');
      throw new Error('Error generating one time pre key bundles, max client size has been reached for this room.');
    }

    const bundle = await generateKeyBundle(identityKeyPair, registrationId, signedPreKeyId, maxRoomSize - count! - 1);

    // Upload bundle & one time pre keys
    await prekeys(roomId!, bundle);
  }

  /** Generates key bundle and one-time pre-keys for upload. */
  async function generateKeyBundle(identityKeyPair: any, registrationId: number, signedPreKeyId: number, amount: number) {
    // Generate signed pre-key
    const spk = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
    const signedPreKey = spk.keyPair;
    const signedPreKeySig = spk.signature;
    await store.storeSignedPreKey(signedPreKeyId, signedPreKey);
    await store.put(`signedPreKeySig_${signedPreKeyId}`, spk.signature);

    // Generate one-time pre-keys for clients
    const startId = Math.floor(Math.random() * 1000) + 1000;
    const preKeys = await generatePreKeys(startId, amount);

    return {
      identityKey: toBase64(new Uint8Array(identityKeyPair.pubKey)),
      registrationId,
      signedPreKey: {
        id: signedPreKeyId,
        pubKey: toBase64(new Uint8Array(signedPreKey.pubKey)),
        signature: toBase64(new Uint8Array(signedPreKeySig!))
      },
      preKeys,
      clientId,
    };
  }

  /**
   * Generates one-time pre-keys for clients and stores them in the local store.
   * @param startId The starting ID for the pre-keys.
   * @param amount Number of pre-keys to generate.
   * @returns An array of pre-key descriptors with `id` and `pubKey` for server upload.
   */
  async function generatePreKeys(startId: number, amount: number): Promise<{id: number; pubKey: string}[]> {
    const preKeys: { id: number; pubKey: string }[] = [];

    for (let i = 0; i < amount; i++) {
      const id = startId + i;
      const preKey = await KeyHelper.generatePreKey(id);
      await store.storePreKey(id, preKey.keyPair);
      preKeys.push({ id, pubKey: toBase64(new Uint8Array(preKey.keyPair.pubKey)) });
    }

    return preKeys;
  }

  /** Initialises pairwise sessions with all current room clients. Re-use sessions where possible. */
  async function connectWithRoomClients(): Promise<void> {
    const { data: bundles, error } = await supabase
      .from('prekey_bundles')
      .select('*')
      .eq('room_id', roomId)
      .neq('client_id', clientId)

    if (error) {
      goto('/');
      alert('Error retrieving bundles');
      throw error;
    }
    
    // Client is first room client
    if (!bundles?.length) {
      return;
    }

    // Room is filled
    if (bundles.length >= maxRoomSize) {
      goto('/');
      alert('Room is full.');
      throw new Error('Room is full.');
    }

    for (const bundle of bundles) {
      const address = new libsignal.SignalProtocolAddress(bundle.client_id, 1);

      // Reuse existing session if it exists
      const existingSession = await store.loadSession(address.toString());
      if (existingSession) {
        console.log(`Reusing session with ${bundle.client_id}`);
        clientSessions.set(bundle.client_id, new SessionCipher(store, address));
        continue;
      }

      // Grab unused one-time pre-key
      const { data: preKeys, error: preKeyErr } = await supabase
        .from('one_time_prekeys')
        .select('*')
        .eq('room_id', roomId)
        .eq('client_id', bundle.client_id)
        .order('id', { ascending: true })
        .limit(1)

      if (preKeyErr || !preKeys || !preKeys.length) {
        goto('/');
        alert(`No prekeys left for peer ${bundle.client_id}`);
        throw new Error(`No prekeys left for peer ${bundle.client_id} ${preKeyErr}`);
      }

      const preKey = preKeys[0];

      // Mark pre-key as consumed
      await supabase
        .from('one_time_prekeys')
        .delete()
        .eq('room_id', roomId)
        .eq('id', preKey.id);

      // Build pre-key bundle & establish session
      const preKeyBundle = {
        identityKey: fromBase64(bundle.identity_key).buffer,
        registrationId: bundle.registration_id,
        signedPreKey: {
          keyId: bundle.signed_prekey_id,
          publicKey: fromBase64(bundle.signed_prekey_pub).buffer,
          signature: fromBase64(bundle.signed_prekey_sig).buffer,
        },
        preKey: {
          keyId: preKey.id,
          publicKey: fromBase64(preKey.pub).buffer,
        },
      };

      const sb = new SessionBuilder(store, address);
      await sb.processPreKey(preKeyBundle);

      clientSessions.set(bundle.client_id, new SessionCipher(store, address));
    }
  }

  /** Subscribe to messages table updates. */
  function subscribeMessages() {
    const baseQuery = {schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}`};

    messagesSub = supabase
      .channel('public:messages')
      .on('postgres_changes', {...baseQuery, event: 'INSERT'}, (payload) => {
        handleIncomingRow(payload.new as Database['public']['Tables']['messages']['Row']);
      })
      .on('postgres_changes', {...baseQuery, event: 'UPDATE'}, (payload) => {
        handleIncomingRow(payload.new as Database['public']['Tables']['messages']['Row']);
      })
      .subscribe();
  }

  /** Subscribe to room deletion → auto-kick clients. */
  function subscribeToRoomDeletion() {
    roomSub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
        store?.destroy();
        goto('/');
        alert('Room was destroyed.');
      })
      .subscribe();
  }

  /** Handle incoming encrypted messages. */
  async function handleIncomingRow(row: Database['public']['Tables']['messages']['Row']): Promise<void> {
    if (row.recipient !== clientId) {
      return;
    }

    const binary = fromBase64(row.payload);
    const sender = row.sender;
    let sc = clientSessions.get(sender);

    // If no session cipher exists yet, attempt to establish or resume one
    if (!sc) {
      const address = new libsignal.SignalProtocolAddress(sender, 1);
      sc = new SessionCipher(store, address);
      clientSessions.set(sender, sc);
    }

    let decrypted: ArrayBuffer;

    try {
      decrypted = await sc.decryptPreKeyWhisperMessage(binary.buffer);
    } catch {
      try {
        decrypted = await sc.decryptWhisperMessage(binary.buffer);
      } catch (err) {
        console.error("Decryption failed from", sender, err);
        return;
      }
    }

    const msg = strFromU8(new Uint8Array(decrypted));

    if (msg === "request clipboard") {
      await sendRawToClient(clipboard, sender, sc);
    } else {
      // Only update if newer
      if (!row.updated_at || (latestClipboardEventDate && new Date(row.updated_at) < latestClipboardEventDate)) {
        return;
      }

      latestClipboardEventDate = new Date(row.updated_at);
      clipboard = msg;
    }
  }

  /** Broadcast plaintext to all connected clients. */
  async function broadcastRaw(text: string): Promise<void> {
    // Prefer spread, entries() returns iterator on safari.
    await Promise.all([...clientSessions.entries()].map(async clientSession => {
      const [clientId, sc] = clientSession;
      await sendRawToClient(text, clientId, sc);
    }));
  }

  /** Broadcast plaintext to all connected clients. */
  async function sendRawToClient(raw: string, client: string, sc: SessionCipher) {
    const pt = u8FromStr(raw);
    const message = await sc.encrypt(pt.buffer);
    const payload = toBase64FromStr(message.body!);

    await supabase.from('messages').upsert({
      room_id: roomId,
      sender: clientId,
      recipient: client,
      payload
    });
  }

  /** Track textarea input changes. */
  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    updateClipboardInternal(target.value);
  }

  /** Debounce clipboard updates before broadcasting. */
  function updateClipboardInternal(val: string): void {
    clearTimeout(actionTimeOut);
    actionTimeOut = setTimeout(async () => {
      copied = false;
      clearTimeout(removeCopyMessageTimeOut);
      clipboard = val;

      // As host, keep copy of clipboard content to persist on reload.
      await store.put('clipboard', clipboard);
      await broadcastRaw(val);
    }, 1000); 
  }

  async function destroy() {
    if (!browser || !confirm('Destroy this room for all clients? This cannot be undone.')) {
      return;
    }

    roomSub?.unsubscribe();
    await destroyRoom(roomId);
    store?.destroy();
    goto('/');
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(clipboard);
      copied = true;
      removeCopyMessageTimeOut = setTimeout(() => (copied = false), 2000);
    } catch (e) {
      console.error(e);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        updateClipboardInternal(text);
      }
    } catch (err) {
      console.warn('Clipboard paste failed or was cancelled', err);
    }
  }

  async function shareRoom() {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my clipboard room',
          url: roomUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or failed', err);
      }
    } else {
      await navigator.clipboard.writeText(roomUrl);
      alert('Link copied to clipboard!');
    }
  }

  /**
   * Ensures that the local device has a persistent identity key pair and registration ID.
   * 
   * If they already exist in storage, they are returned as-is.
   * If not, new values are generated, stored, and then returned.
   *
   * @returns {Promise<{identityKeyPair: libsignal.KeyPairType<ArrayBuffer>, registrationId: number}>}
   */
  async function ensureIdentityAndRegistration(): Promise<{identityKeyPair: libsignal.KeyPairType<ArrayBuffer>; registrationId: number}> {
    let identityKeyPair = await store.getIdentityKeyPair();
    let registrationId = await store.getLocalRegistrationId();

    if (!identityKeyPair || !registrationId) {
      identityKeyPair = await KeyHelper.generateIdentityKeyPair();
      registrationId = await KeyHelper.generateRegistrationId();
      await store.putIdentityKeyPair(identityKeyPair);
      await store.putLocalRegistrationId(registrationId);
    }

    return {identityKeyPair, registrationId};
  }
</script>

<div class="mx-auto p-6 space-y-6">
  <button
    type="button"
    class="text-3xl font-bold text-gray-800 text-center w-full cursor-pointer hover:text-indigo-600 transition"
    on:click={shareRoom}
  >
    Room <span class="text-indigo-600">#{roomId}</span> 🔗
  </button>

  <!-- QR Code -->
  {#if qrCodeUrl}
    <div class="flex justify-center">
      <img src={qrCodeUrl} alt="QR Code for room" class="rounded-xl shadow border p-2 bg-white" />
    </div>
    <p class="text-sm text-gray-500 text-center">Share code or scan to join this room</p>
  {/if}

  <textarea
    bind:value={clipboard}
    on:input={handleInput}
    rows="10"
    class="w-full rounded-xl border p-4 text-gray-800 shadow-inner resize-none transition focus:outline-none focus:ring-2 focus:ring-indigo-500 
      {copied ? 'border-green-500 ring-2 ring-green-400' : 'border-gray-300'}"
    placeholder="Type or paste to share clipboard..."
  ></textarea>

  <!-- Copy/Paste buttons -->
  <div class="flex gap-4">
    <button
      class="flex-1 px-4 py-2 rounded-xl font-medium shadow active:scale-95 transition
        {copied 
          ? 'bg-green-500 text-white hover:bg-green-600' 
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}"
      on:click={copyToClipboard}
    >
      {#if copied}
        ✅ Copied!
      {:else}
        📋 Copy
      {/if}
    </button>  
    <button
      class="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-medium shadow hover:bg-gray-200 active:scale-95 transition"
      on:click={pasteFromClipboard}
    >
      📥 Paste
    </button>
  </div>

  <!-- Destroy button -->
  <button
    class="w-full px-6 py-3 rounded-xl bg-red-500 text-white font-semibold shadow hover:bg-red-600 active:scale-95 transition"
    on:click={destroy}
  >
    🗑 Destroy Room
  </button>

  <p class="text-sm text-gray-500 text-center">
    Destroying this room will permanently delete its shared clipboard for everyone.
  </p>
</div>
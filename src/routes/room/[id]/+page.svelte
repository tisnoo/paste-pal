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

  let roomId = $page.params.id!;
  let clipboard = '';
  let qrCodeUrl = '';
  let copied = false;
  let removeCopyMessageTimeOut: NodeJS.Timeout | undefined;
  let actionTimeOut: NodeJS.Timeout | undefined;

  // E2EE state
  let store: SignalStore;
  let isHost = false;
  let room: Database['public']['Tables']['rooms']['Row'] | null;
  let clientId: string;
  let sessionCipher: any;
  let clientSessions = new Map<string, SessionCipher>(); // host only
  let messagesSub: RealtimeChannel | undefined;
  let roomSub: RealtimeChannel | undefined;

  onDestroy(() => {
    messagesSub?.unsubscribe();
    roomSub?.unsubscribe();
    actionTimeOut?.close();
    removeCopyMessageTimeOut?.close();
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
    isHost = room?.host_id === clientId || !room;

    if (isHost) {
      await setupHost();
    } else {
      await setupClient();
    }

    subscribeMessages();
    subscribeToRoomDeletion();
  });

  /**
   * Initializes the host for a room:
   * - Inserts the room into the database if it doesn't exist.
   * - Ensures the host has a persistent identity key pair and registration ID.
   * - Loads or generates a signed pre-key. If a signed pre-key already exists,
   *   the host restores the saved clipboard content and terminates early.
   * - Generates one-time pre-keys for client consumption.
   * - Uploads the host's pre-key bundle to the server for clients to establish sessions.
   */
  async function setupHost(): Promise<void> {
    if (!room) {
      room = (await supabase.from('rooms').insert({ id: roomId, host_id: clientId }).select('*').single()).data!;
    }

    // Ensure persistent identity key pair and registration ID
    const {identityKeyPair, registrationId} = await ensureIdentityAndRegistration();

    // fixed id for deterministic storage
    const signedPreKeyId = 1;
    let signedPreKey = await store.loadSignedPreKey(signedPreKeyId);

    // If pre-key already exists, restore clipboard and exit early
    if (signedPreKey) {
      const savedClipboard = await store.get('clipboard');
      clipboard = savedClipboard || "";
      return;
    }

    // Generate signed pre-key
    const spk = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
    signedPreKey = spk.keyPair;
    const signedPreKeySig = spk.signature;
    await store.storeSignedPreKey(signedPreKeyId, signedPreKey);
    await store.put(`signedPreKeySig_${signedPreKeyId}`, spk.signature);

    // Generate one-time pre-keys for clients
    const startId = Math.floor(Math.random() * 1000) + 1000;
    const preKeys = await generatePreKeys(startId, 10);

    // Upload pre-key bundle to server
    const bundle = {
      identityKey: toBase64(new Uint8Array(identityKeyPair.pubKey)),
      registrationId,
      signedPreKey: {
        id: signedPreKeyId,
        pubKey: toBase64(new Uint8Array(signedPreKey.pubKey)),
        signature: toBase64(new Uint8Array(signedPreKeySig!))
      },
      preKeys
    };

    await prekeys(roomId!, bundle);
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

  /**
   * Initializes the client in a room:
   * - Loads an existing session if available.
   * - Otherwise, fetches the host's pre-key bundle and consumes a one-time pre-key.
   * - Establishes a new Signal session with the host.
   * - Requests the initial clipboard content from the host.
   */
  async function setupClient(): Promise<void> {
    const address = new libsignal.SignalProtocolAddress(room!.host_id, 1);

    // Reuse session if already stored
    const existingSession = await store.loadSession(address.toString());
    if (existingSession) {
      console.log('Reusing session from storage');
      sessionCipher = new SessionCipher(store, address);
      await requestInitialMessageClient();
      return;
    }

    // Fetch host pre-key bundle
    const { data: hostBundle, error: hostErr } = await supabase
      .from('prekey_bundles')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (hostErr || !hostBundle) {
      console.error('No host bundle');
      return;
    }

    // Consume one unused one-time prekey
    const { data: deletedPreKeys, error } = await supabase
      .from('one_time_prekeys')
      .delete()
      .eq('room_id', roomId)
      .order('id', { ascending: true })  // optional: pick the "first" pre-key
      .limit(1)
      .select('*');

    if (error || !deletedPreKeys || !deletedPreKeys.length) {
      console.error('No prekeys left', error);
      return;
    }

    const preKey = deletedPreKeys[0];

    await ensureIdentityAndRegistration();

    // Build pre-key bundle for establishing session.
    const preKeyBundle = {
      identityKey: fromBase64(hostBundle.identity_key).buffer,
      registrationId: hostBundle.registration_id,
      signedPreKey: {
        keyId: hostBundle.signed_prekey_id,
        publicKey: fromBase64(hostBundle.signed_prekey_pub).buffer,
        signature: fromBase64(hostBundle.signed_prekey_sig).buffer,
      },
      preKey: {
        keyId: preKey.id,
        publicKey: fromBase64(preKey.pub).buffer,
      }
    };

    // Establish new session with host
    const sb = new SessionBuilder(store, address);
    await sb.processPreKey(preKeyBundle);

    sessionCipher = new SessionCipher(store, address);
    await requestInitialMessageClient();
  }

  /**
   * Requests initial clipboard content as connecting client
   */
  async function requestInitialMessageClient() {
    const msgBytes = u8FromStr('request clipboard');
    const message = await sessionCipher.encrypt(msgBytes.buffer);
    const payload = toBase64FromStr(message.body);
    await supabase.from('messages').insert({
      room_id: roomId,
      sender: clientId,
      recipient: room!.host_id,
      payload
    });
  }

  /** Subscribe to messages table, each message can concern client. */
  function subscribeMessages() {
    messagesSub = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        handleIncomingRow(payload.new);
      })
      .subscribe();
  }

  /**
   * Get notified if room is deleted, should kick user out.
   */
  function subscribeToRoomDeletion() {
    roomSub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
        if (store) {
          store.destroy();
        }
        
        goto('/');
        alert('Room has been destroyed, returning home.');
      })
      .subscribe();
  }

  /**
   * Handles an incoming message row from the Supabase `messages` table.
   *
   * - On the host: establishes or resumes sessions with clients, decrypts incoming
   *   messages, updates the clipboard, and optionally rebroadcasts clipboard content.
   * - On a client: decrypts messages from the host and updates the clipboard.
   *
   * Special case: if the message is `"request clipboard"`, the host will rebroadcast
   * its current clipboard state to the requesting client(s).
   *
   * @param {any} row - A row from the `messages` table representing an encrypted message.
   */
  async function handleIncomingRow(row: any): Promise<void> {
    if (row.recipient !== clientId) {
      return;
    }

    const binary = fromBase64(row.payload);

    // Client sending either updated clipboard or handshake to host
    if (isHost) {
      const sender = row.sender;
      let sc = clientSessions.get(sender);

      // If no session cipher exists yet, attempt to establish or resume one
      if (!sc) {
        const address = new libsignal.SignalProtocolAddress(sender, 1);
        sc = new SessionCipher(store, address);

        let decrypted;
        try {
          decrypted = await sc.decryptPreKeyWhisperMessage(binary.buffer);
          console.log("Host: established session via pre-key with", sender);
        } catch (e) {
          try {
            decrypted = await sc.decryptWhisperMessage(binary.buffer);
            console.log("Host: resumed session with", sender);
          } catch (err2) {
            console.error("Host decrypt error (no session match)", err2);
            return;
          }
        }

        clientSessions.set(sender, sc);
        const msg = strFromU8(new Uint8Array(decrypted));
        if (msg === "request clipboard") {
          await broadcastClipboard(clipboard);
        }
        return;
      }

      // Existing session: decrypt normally
      try {
        const decrypted = await sc.decryptWhisperMessage(binary.buffer);
        const msg = strFromU8(new Uint8Array(decrypted));

        if (msg === "request clipboard") {
          await broadcastClipboard(clipboard);
        } else {
          clipboard = msg;
          await broadcastClipboard(msg);
        }
      } catch (e) {
        console.error('Host decrypt whisper error', e);
      }
    } 
    // Host sending clipboard content to client
    else {
      try {
        let decrypted;
        try {
          decrypted = await sessionCipher.decryptPreKeyWhisperMessage(binary);
        } catch {
          decrypted = await sessionCipher.decryptWhisperMessage(binary);
        }
        clipboard = strFromU8(new Uint8Array(decrypted));
      } catch (e) {
        console.error('Client decrypt error', e);
      }
    }
  }

  /**
   * Broadcasts the current clipboard text from the host to all connected clients.
   *
   * This function encrypts the given plaintext with each client's established
   * Signal session and publishes the resulting ciphertext as a message to Supabase.
   * Only the host can invoke this; on clients it exits early.
   *
   * @param {string} text - The clipboard content to distribute to all connected clients.
   */
  async function broadcastClipboard(text: string): Promise<void> {
    if (!isHost) {
      return;
    }

    const pt = u8FromStr(text);

    await Promise.all(clientSessions.entries().map(async clientSession => {
      const [clientId, sc] = clientSession;
      const message = await sc.encrypt(pt.buffer);
      const payload = toBase64FromStr(message.body!);
      await supabase.from('messages').insert({
        room_id: roomId,
        sender: room!.host_id,
        recipient: clientId,
        payload
      });
    }));
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    updateClipboardInternal(target.value);
  }

  /**
   * Update clipboard after timeout, if updated within timeout period reset timeout.
   */
  function updateClipboardInternal(val: string): void {
    clearTimeout(actionTimeOut);
    actionTimeOut = setTimeout(async () => {
      copied = false;
      clearTimeout(removeCopyMessageTimeOut);
      clipboard = val;

      if (isHost) {
        // As host, keep copy of clipboard content to persist on reload.
        await store.put('clipboard', clipboard);
        await broadcastClipboard(val);
      } else {
        const pt = u8FromStr(val);
        const message = await sessionCipher.encrypt(pt.buffer);
        const payload = toBase64FromStr(message.body!);
        await supabase.from('messages').insert({
          room_id: roomId,
          sender: clientId,
          recipient: room!.host_id,
          payload
        });
      }
    }, 1000); 
  }

  async function destroy() {
    if (confirm('Are you sure you want to destroy this room?\n\nThis will remove it for EVERYONE and cannot be undone.')) {
      if (!browser) {
        return;
      }

      // Ignore events from room subscription
      roomSub?.unsubscribe();

      await destroyRoom(roomId);

      if (store) {
        store.destroy();
      }

      goto('/');
    }
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
      if (text) updateClipboardInternal(text);
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
      alert('🔗 Link copied to clipboard!');
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
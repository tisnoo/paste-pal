/* eslint-disable @typescript-eslint/no-explicit-any */
import { browser } from '$app/environment';
import type { Direction, KeyPairType, StorageType } from '@privacyresearch/libsignal-protocol-typescript/lib/types';
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Define database schema
interface SignalDB extends DBSchema {
  kv: {
    key: string;
    value: any;
  };
}

// Define SignalStore interface
export interface SignalStore extends StorageType {
  destroy: () => Promise<void>;
  put: <T = any>(key: string, value: T) => Promise<void>;
  get: <T = any>(key: string) => Promise<T | undefined>;
  remove: (key: string) => Promise<void>;
  putIdentityKeyPair: (keyPair: KeyPairType<ArrayBuffer>) => Promise<void>;
  putLocalRegistrationId: (id: number) => Promise<void>;
  loadIdentity: (id: number) => Promise<void>;
}

export function createSignalStore(roomId: string) : SignalStore {
  let dbPromise: Promise<IDBPDatabase<SignalDB>> | undefined;

  if (browser) {
    dbPromise = openDB(roomId, 1, {
      upgrade(db) {
        db.createObjectStore('kv');
      },
    });
  }

  return {
    destroy: async function() {
      await deleteDB(roomId);
    },
    put: async function<T>(key: string, value: T): Promise<void> {
      if (!dbPromise) {
        return;
      }

      const db = await dbPromise;
      await db.put('kv', value, key);
    },
    get: async function<T = any>(key: string): Promise<T | undefined> {
      if (!dbPromise) {
        return undefined;
      }
      
      const db = await dbPromise;
      return await db.get('kv', key);
    },
    remove: async function(key: string): Promise<void> {
      if (!dbPromise) {
        return;
      }
    
      const db = await dbPromise;
      await db.delete('kv', key);
    },
    getIdentityKeyPair: async function() { return await this.get('identityKey') || undefined; },
    putIdentityKeyPair: async function(k: KeyPairType<ArrayBuffer>){ await this.put('identityKey', k); },
    getLocalRegistrationId: async function(){ return await this.get('registrationId'); },
    putLocalRegistrationId: async function(id:number){ await this.put('registrationId', id); },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isTrustedIdentity: function(_identifier: string, _identityKey: ArrayBuffer, _direction: Direction) { return Promise.resolve(true);},
    saveIdentity: async function(address: any, key: any) {
      await this.put(`identityKey:${address.toString()}`, key);
      return true;
    },
    loadIdentity: async function(address: any) {
      return await this.get(`identityKey:${address.toString()}`);
    },
    storePreKey: async function(keyId: string | number, keyPair: KeyPairType<ArrayBuffer>){ await this.put(`preKey_${keyId}`, keyPair); },
    loadPreKey: async function(encodedAddress: string | number){ return await this.get(`preKey_${encodedAddress}`); },
    removePreKey: async function(keyId: string | number){ await this.remove(`preKey_${keyId}`); },

    storeSignedPreKey: async function(keyId: string | number, keyPair: KeyPairType<ArrayBuffer>){ await this.put(`signedPreKey_${keyId}`, keyPair); },
    loadSignedPreKey: async function(keyId: string | number){ return await this.get(`signedPreKey_${keyId}`); },
    removeSignedPreKey: async function(keyId: string | number){ await this.remove(`signedPreKey_${keyId}`); },

    storeSession: async function(key:string, record:any){ await this.put(`session_${key}`, record); },
    loadSession: async function(key:string){ return await this.get(`session_${key}`); },
  };
}

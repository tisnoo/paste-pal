// src/lib/encoding.ts
export const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converts a raw string (like message.body) to Uint8Array
export const strToUint8Array = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

// Base64 encode
export const toBase64FromStr = (str: string): string => {
  return btoa(String.fromCharCode(...strToUint8Array(str)));
}


export const fromBase64 = (s: string) => {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr;
};
export const u8FromStr = (s:string) => new TextEncoder().encode(s);
export const strFromU8 = (u:Uint8Array) => new TextDecoder().decode(u);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toArrayBuffer = (msg: any) => {
  if (msg instanceof ArrayBuffer) return msg;
  if (msg instanceof Uint8Array) return msg.buffer;
  if ('serialize' in msg) return msg.serialize().buffer;
  throw new Error('Unsupported message type');
}


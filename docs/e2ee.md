## Paste-Pal End-To-End-Encryption (E2EE)
Paste pal implements E2EE via the Signal protocol.

Flow diagram:
Client Clipboard Update
│
▼
SessionCipher.encrypt()
│
Base64 encode
│
Insert into Supabase messages
│
▼
Host fetches messages
│
Base64 decode → SessionCipher.decrypt()
│
Update Host clipboard state
│
Broadcast back to clients

Todo:
- Host refreshing should keep host.
- Host leaving should change host.
- If possible, not a host key but rather a server key.
- Not each message needs to be saved.
- Everything needs to be removed when room is destroyed.
- Only push after second on inactivity.
- Tests + design
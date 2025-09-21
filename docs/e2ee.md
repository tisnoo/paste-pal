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
- DONE Host refreshing should keep host.
- Host leaving should change host.
- If possible, not a host key but rather a server key.
- DONE Everything needs to be removed when room is destroyed.
- DONE Only push after second on inactivity.
- DONE Not each message needs to be saved.
- Tests + design

- Make e2ee more visible, validating keys? Paper that people can view?
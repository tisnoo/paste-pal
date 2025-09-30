<script lang="ts">
  import { goto } from '$app/navigation';

  function goHome() {
    goto('/');
  }
</script>

<h1 class="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-8">
  End-to-End Encryption in Paste Pal
</h1>

<p>
  <strong>Paste Pal 📋</strong> implements end-to-end encryption (E2EE) to ensure clipboard content
  remains secure and private between participants. All messages are encrypted on the client side,
  and the server only stores ciphertext.
</p>

<h2 class="text-xl font-semibold mt-4">Architecture</h2>
<p>
  Each client generates a persistent identity key pair and a set of one-time pre-keys.
  These keys allow clients to establish secure pairwise sessions with other participants.
  The server acts purely as a message relay and never sees plaintext.
</p>

<p class="text-center text-gray-500">
  <!-- Diagram placeholder -->
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="240" viewBox="0 0 1400 240" fill="none">
    <rect x="40" y="40" width="220" height="160" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="150" y="70" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#0f172a">Client A</text>
    <text x="150" y="95" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#334155">identity, signedPreKey, one-time pre-keys</text>
  
    <rect x="540" y="40" width="220" height="160" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="650" y="70" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#0f172a">Client B</text>
    <text x="650" y="95" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#334155">identity, signedPreKey, one-time pre-keys</text>
  
    <!-- arrows -->
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#0f172a"/>
      </marker>
    </defs>
  
    <line x1="260" y1="120" x2="540" y2="120" stroke="#0f172a" stroke-width="2" marker-end="url(#arrow)"/>
    <text x="400" y="110" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#0f172a">fetch bundle → X3DH handshake</text>
  
    <g transform="translate(300,150)">
      <rect x="0" y="10" width="200" height="40" rx="6" fill="#e6fffa" stroke="#a7f3d0"/>
      <text x="100" y="35" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#065f46">Pairwise session (ratcheting)</text>
    </g>
  </svg>
</p>

<h2 class="text-xl font-semibold mt-4">Pairwise Encryption</h2>
<p>
  In a room with <code>N</code> clients, each client establishes a separate encrypted session
  with every other client, resulting in <code>N * (N - 1) / 2</code> unique pairwise sessions.
  Messages are encrypted individually for each recipient and sent via the server.
</p>

<p class="text-center text-gray-500">
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 1400 300" fill="none">
    <defs><marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2"><circle cx="2" cy="2" r="2" fill="#0b84ff"/></marker></defs>
  
    <!-- positions for 5 nodes -->
    <!-- Node A -->
    <g>
      <circle cx="150" cy="80" r="28" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="150" y="86" font-family="Inter, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#0f172a">A</text>
    </g>
    <!-- Node B -->
    <g>
      <circle cx="400" cy="40" r="28" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="400" y="46" font-family="Inter, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#0f172a">B</text>
    </g>
    <!-- Node C -->
    <g>
      <circle cx="660" cy="120" r="28" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="660" y="126" font-family="Inter, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#0f172a">C</text>
    </g>
    <!-- Node D -->
    <g>
      <circle cx="220" cy="300" r="28" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="220" y="306" font-family="Inter, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#0f172a">D</text>
    </g>
    <!-- Node E -->
    <g>
      <circle cx="560" cy="320" r="28" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="560" y="326" font-family="Inter, Arial, sans-serif" font-size="13" text-anchor="middle" fill="#0f172a">E</text>
    </g>
  
    <!-- edges (pairwise encrypted channels) -->
    <line x1="150" y1="80" x2="400" y2="40" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="150" y1="80" x2="660" y2="120" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="150" y1="80" x2="220" y2="300" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="150" y1="80" x2="560" y2="320" stroke="#94a3b8" stroke-width="1.8"/>
  
    <line x1="400" y1="40" x2="660" y2="120" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="400" y1="40" x2="220" y2="300" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="400" y1="40" x2="560" y2="320" stroke="#94a3b8" stroke-width="1.8"/>
  
    <line x1="660" y1="120" x2="220" y2="300" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="660" y1="120" x2="560" y2="320" stroke="#94a3b8" stroke-width="1.8"/>
    <line x1="220" y1="300" x2="560" y2="320" stroke="#94a3b8" stroke-width="1.8"/>
  </svg>
</p>

<h2 class="text-xl font-semibold mt-4">One-Time Pre-Keys</h2>
<p>
  One-time pre-keys allow a new client to establish a secure session with any existing client,
  even if the recipient is offline. Each pre-key is consumed once, preventing replay attacks and
  ensuring forward secrecy.
</p>

<h2 class="text-xl font-semibold mt-4">Message Flow</h2>
<p>When a client updates the clipboard:</p>
<ul class="list-disc list-inside space-y-2">
  <li>The client encrypts the new content separately for each session.</li>
  <li>The encrypted message is sent to the server, which stores it temporarily.</li>
  <li>Each recipient decrypts the message using their session key.</li>
</ul>

<p class="text-center text-gray-500">
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 1800 220" fill="none">
    <rect x="40" y="40" width="200" height="120" rx="8" fill="#fff7ed" stroke="#ffd8a8"/>
    <text x="140" y="72" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#92400e">Client A</text>
    <text x="140" y="98" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#7c2d12">encrypt per peer</text>
  
    <rect x="350" y="40" width="200" height="120" rx="8" fill="#f1f5f9" stroke="#e2e8f0"/>
    <text x="450" y="72" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#0f172a">Supabase (ciphertext)</text>
    <text x="450" y="98" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#334155">store & realtime pub/sub</text>
  
    <rect x="660" y="40" width="200" height="120" rx="8" fill="#ecfccb" stroke="#bbf7d0"/>
    <text x="760" y="72" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#14532d">Client B</text>
    <text x="760" y="98" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#14532d">decrypt with session</text>
  
    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#0f172a"/></marker></defs>
  
    <line x1="240" y1="100" x2="350" y2="100" stroke="#0f172a" stroke-width="2" marker-end="url(#arr)"/>
    <text x="295" y="92" font-family="Inter, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#0f172a">ciphertext</text>
  
    <line x1="550" y1="100" x2="660" y2="100" stroke="#0f172a" stroke-width="2" marker-end="url(#arr)"/>
    <text x="605" y="92" font-family="Inter, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#0f172a">deliver</text>
  </svg>
</p>

<h2 class="text-xl font-semibold mt-4">Forward Secrecy and Security</h2>
<p>
  Using Signal Protocol’s double ratchet algorithm, sessions automatically update keys after each message.
  Even if a session key is compromised, past messages remain secure.
</p>

<h2 class="text-xl font-semibold mt-4">Conclusion</h2>
<p>
  Paste Pal’s E2EE design ensures that clipboard content remains private across all participants.
  The server never has access to plaintext, and dynamic key management allows new clients to join
  securely at any time.
</p>

<button
  class="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 active:scale-[0.98] transition"
  on:click={goHome}
>
  Back to Home
</button>

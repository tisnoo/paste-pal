<script lang="ts">
  import { goto } from '$app/navigation';

  function goHome() {
    goto('/');
  }
</script>

<h1 class="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-8">
  Privacy Policy
</h1>

<div class="max-w-2xl mx-auto text-gray-700 leading-relaxed space-y-6">
  <p>
    <strong>Paste Pal 📋</strong> is designed for fast, temporary sharing of text across devices.
  </p>

  <ul class="list-disc list-inside space-y-2">
    <li>We do not collect personal information such as names or email addresses.</li>
    <li>All data is stored securely in Supabase and is only accessible via direct room links.</li>
    <li>Clipboard data is encrypted end-to-end between clients. We cannot read or access your messages.</li>
    <li>Data may be automatically deleted after a period of inactivity or if a room is destroyed.</li>
  </ul>

  <p>
    Since content is user-generated, you are responsible for the information you share. Avoid sharing sensitive data.
  </p>

  <button
    class="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 active:scale-[0.98] transition"
    on:click={goHome}
  >
    Back to Home
  </button>
</div>

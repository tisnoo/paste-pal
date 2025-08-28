<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
  <main class="w-full max-w-lg bg-white shadow-xl rounded-2xl p-8">
    <slot />
  </main>
</div>

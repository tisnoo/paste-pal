<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
  <!-- Main content -->
  <div class="flex-1 flex items-center justify-center p-6">
    <main class="w-full max-w-lg bg-white shadow-xl rounded-2xl p-8">
      <slot />
    </main>
  </div>

  <!-- Footer -->
  <footer class="py-4 text-center text-sm text-gray-500">
    <p>
      Created with ❤️ by
      <a
        href="https://github.com/tisnoo"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-indigo-600 hover:underline"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-4 h-4"
        >
          <path
            fill-rule="evenodd"
            d="M12 0C5.37 0 0 5.37 0 12a12 12 0 008.21 11.39c.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.24-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.85 1.24 1.92 1.24 3.24 0 4.63-2.8 5.66-5.48 5.96.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z"
            clip-rule="evenodd"
          />
        </svg>
        tisnoo
      </a>
    </p>
  </footer>
</div>

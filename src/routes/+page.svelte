<script lang="ts">
import { invoke } from '@tauri-apps/api/core';

let name = $state('');
let greetMsg = $state('');

async function greet(event: Event) {
  event.preventDefault();
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg = await invoke('greet', { name });
}
</script>

<main class="m-0 flex flex-col justify-center pt-[10vh] text-center">
  <h1 class="text-center">Welcome to Tauri + Svelte</h1>

  <div class="flex justify-center">
    <a
      href="https://vite.dev"
      target="_blank"
      class="
        text-link hover:text-link-hover font-medium
        no-underline
        dark:hover:text-[#24c8db]
      "
    >
      <img
        src="/vite.svg"
        class="
          h-24 p-6 transition-[0.75s]
          hover:drop-shadow-[0_0_2em_#747bff]
        "
        alt="Vite Logo"
      />
    </a>
    <a
      href="https://tauri.app"
      target="_blank"
      class="
        text-link hover:text-link-hover font-medium
        no-underline
        dark:hover:text-[#24c8db]
      "
    >
      <img
        src="/tauri.svg"
        class="
          h-24 p-6 transition-[0.75s]
          hover:drop-shadow-[0_0_2em_#24c8db]
        "
        alt="Tauri Logo"
      />
    </a>
    <a
      href="https://svelte.dev"
      target="_blank"
      class="
        text-link hover:text-link-hover font-medium
        no-underline
        dark:hover:text-[#24c8db]
      "
    >
      <img
        src="/svelte.svg"
        class="
          h-24 p-6 transition-[0.75s]
          hover:drop-shadow-[0_0_2em_#ff3e00]
        "
        alt="SvelteKit Logo"
      />
    </a>
  </div>
  <p>Click on the Tauri, Vite, and SvelteKit logos to learn more.</p>

  <form class="flex justify-center" onsubmit={greet}>
    <input
      id="greet-input"
      placeholder="Enter a name..."
      bind:value={name}
      class="
        text-text-primary dark:bg-dark-bg-secondary mr-1.25 rounded-lg border border-transparent
        bg-white px-[1.2em] py-[0.6em] text-base
        font-medium shadow-[0_2px_2px_rgba(0,0,0,0.2)]
        transition-[border-color_0.25s]
        outline-none dark:text-white
      "
    />
    <button
      type="submit"
      class="
        text-text-primary hover:border-border-focus active:border-border-focus active:bg-bg-active dark:bg-dark-bg-secondary dark:active:bg-dark-bg-active
        cursor-pointer rounded-lg border border-transparent
        bg-white px-[1.2em]
        py-[0.6em]
        text-base
        font-medium shadow-[0_2px_2px_rgba(0,0,0,0.2)]
        transition-[border-color_0.25s] outline-none dark:text-white
      "
    >
      Greet
    </button>
  </form>
  <p>{greetMsg}</p>
</main>

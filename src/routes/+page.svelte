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
        font-medium text-[#646cff] no-underline
        hover:text-[#535bf2]
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
        font-medium text-[#646cff] no-underline
        hover:text-[#535bf2]
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
        font-medium text-[#646cff] no-underline
        hover:text-[#535bf2]
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
        mr-[5px] rounded-lg border border-transparent bg-white px-[1.2em]
        py-[0.6em] text-base font-medium text-[#0f0f0f]
        shadow-[0_2px_2px_rgba(0,0,0,0.2)] transition-[border-color_0.25s]
        outline-none
        dark:bg-[#0f0f0f98] dark:text-white
      "
    />
    <button
      type="submit"
      class="
        cursor-pointer rounded-lg border border-transparent bg-white px-[1.2em]
        py-[0.6em] text-base font-medium text-[#0f0f0f]
        shadow-[0_2px_2px_rgba(0,0,0,0.2)] transition-[border-color_0.25s]
        outline-none
        hover:border-[#396cd8]
        active:border-[#396cd8] active:bg-[#e8e8e8]
        dark:bg-[#0f0f0f98] dark:text-white dark:active:bg-[#0f0f0f69]
      "
    >
      Greet
    </button>
  </form>
  <p>{greetMsg}</p>
</main>

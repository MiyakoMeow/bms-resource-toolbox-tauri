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

<main class="m-0 pt-[10vh] flex flex-col justify-center text-center">
  <h1 class="text-center">Welcome to Tauri + Svelte</h1>

  <div class="flex justify-center">
    <a
      href="https://vite.dev"
      target="_blank"
      class="font-medium text-[#646cff] hover:text-[#535bf2] dark:hover:text-[#24c8db] no-underline"
    >
      <img
        src="/vite.svg"
        class="h-24 p-6 will-change-filter transition-[0.75s] hover:drop-shadow-[0_0_2em_#747bff]"
        alt="Vite Logo"
      />
    </a>
    <a
      href="https://tauri.app"
      target="_blank"
      class="font-medium text-[#646cff] hover:text-[#535bf2] dark:hover:text-[#24c8db] no-underline"
    >
      <img
        src="/tauri.svg"
        class="h-24 p-6 will-change-filter transition-[0.75s] hover:drop-shadow-[0_0_2em_#24c8db]"
        alt="Tauri Logo"
      />
    </a>
    <a
      href="https://svelte.dev"
      target="_blank"
      class="font-medium text-[#646cff] hover:text-[#535bf2] dark:hover:text-[#24c8db] no-underline"
    >
      <img
        src="/svelte.svg"
        class="h-24 p-6 will-change-filter transition-[0.75s] hover:drop-shadow-[0_0_2em_#ff3e00]"
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
      class="mr-[5px] rounded-lg border border-transparent px-[1.2em] py-[0.6em] text-base font-medium font-inherit text-[#0f0f0f] bg-white transition-[border-color_0.25s] shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none dark:text-white dark:bg-[#0f0f0f98]"
    />
    <button
      type="submit"
      class="rounded-lg border border-transparent px-[1.2em] py-[0.6em] text-base font-medium font-inherit text-[#0f0f0f] bg-white transition-[border-color_0.25s] shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none cursor-pointer hover:border-[#396cd8] active:border-[#396cd8] active:bg-[#e8e8e8] dark:text-white dark:bg-[#0f0f0f98] dark:active:bg-[#0f0f0f69]"
    >
      Greet
    </button>
  </form>
  <p>{greetMsg}</p>
</main>

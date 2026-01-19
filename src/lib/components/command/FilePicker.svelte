<script lang="ts">
import { selectDirectory, selectFile } from '$lib/utils/fileDialog.js';

interface Props {
  value: string;
  mode: 'file' | 'directory';
  disabled: boolean;
  inputId?: string;
}

let { value = $bindable(), mode, disabled, inputId }: Props = $props();

// 根据模式生成按钮文本和提示
const buttonText = $derived(mode === 'directory' ? '选择目录...' : '选择文件...');
const buttonTitle = $derived(mode === 'directory' ? '选择目录' : '选择文件');

async function browse() {
  if (mode === 'directory') {
    const path = await selectDirectory();
    if (path) value = path;
  } else {
    const path = await selectFile();
    if (path) value = path;
  }
}

function clear() {
  value = '';
}
</script>

<div class="flex gap-2">
  <input
    type="text"
    bind:value
    {disabled}
    id={inputId}
    placeholder={mode === 'directory' ? '选择目录...' : '选择文件...'}
    class="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 placeholder:text-white/40 disabled:opacity-50"
  />

  <div class="flex gap-2">
    <button
      class="cursor-pointer rounded-lg border-none bg-white/10 px-4 py-2 text-white/80 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
      onclick={browse}
      {disabled}
      title={buttonTitle}
    >
      {buttonText}
    </button>
    {#if value}
      <button
        class="cursor-pointer rounded-lg border-none bg-white/10 px-4 py-2 text-white/80 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={clear}
        {disabled}
        title="清除当前路径"
      >
        ✕
      </button>
    {/if}
  </div>
</div>

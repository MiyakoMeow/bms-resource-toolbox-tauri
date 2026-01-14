<script lang="ts">
import { selectDirectory, selectFile } from '$lib/utils/fileDialog.js';

interface Props {
  value: string;
  mode: 'file' | 'directory';
  disabled: boolean;
  inputId?: string;
}

let { value = $bindable(), mode, disabled, inputId }: Props = $props();

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

<div class="file-picker">
  <input
    type="text"
    bind:value
    {disabled}
    id={inputId}
    placeholder={mode === 'directory' ? '选择目录...' : '选择文件...'}
    class="file-input"
  />

  <div class="file-actions">
    <button class="btn-browse" onclick={browse} {disabled}> 浏览 </button>
    {#if value}
      <button class="btn-clear" onclick={clear} {disabled}> 清除 </button>
    {/if}
  </div>
</div>

<style>
.file-picker {
  display: flex;
  gap: 0.5rem;
}

.file-input {
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.9);
}

.file-input::placeholder {
  color: rgb(255 255 255 / 0.4);
}

.file-input:disabled {
  opacity: 0.5;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-browse,
.btn-clear {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.8);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-browse:hover,
.btn-clear:hover {
  background-color: rgb(255 255 255 / 0.15);
}

.btn-browse:disabled,
.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

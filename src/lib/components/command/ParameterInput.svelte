<script lang="ts">
import type { CommandParameter } from '$lib/types/commands.js';
import { ParameterType } from '$lib/types/enums.js';
import FilePicker from './FilePicker.svelte';
import EnumSelect from './EnumSelect.svelte';

interface Props {
  param: CommandParameter;
  value: unknown;
  disabled: boolean;
}

let { param, value = $bindable(), disabled }: Props = $props();

// 生成唯一的 input ID
const inputId = $derived(`input-${param.name}-${Math.random().toString(36).substring(2, 9)}`);

// 类型安全的中间状态
let stringValue = $state((value as string) ?? '');
let boolValue = $state(Boolean(value));

// 监听中间状态变化，同步回 value
$effect(() => {
  if (param.type === ParameterType.File || param.type === ParameterType.Directory) {
    value = stringValue;
  } else if (param.type === ParameterType.Boolean) {
    value = boolValue;
  }
});

// 监听 value 变化，同步到中间状态
$effect(() => {
  if (param.type === ParameterType.File || param.type === ParameterType.Directory) {
    stringValue = (value as string) ?? '';
  } else if (param.type === ParameterType.Boolean) {
    boolValue = Boolean(value);
  }
});
</script>

<div class="flex flex-col gap-2">
  <label class="text-sm font-medium text-white/80" for={inputId}>
    {#if param.required}
      <span class="text-red-400">*</span>
    {/if}
    {param.name}
  </label>

  <p class="text-xs text-white/50">{param.description}</p>

  {#if param.type === ParameterType.String}
    <input
      id={inputId}
      type="text"
      bind:value
      {disabled}
      placeholder="请输入..."
      class="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 placeholder:text-white/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:opacity-50"
    />
  {:else if param.type === ParameterType.Number}
    <input
      id={inputId}
      type="number"
      bind:value
      {disabled}
      class="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 placeholder:text-white/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:opacity-50"
    />
  {:else if param.type === ParameterType.Boolean}
    <label class="flex cursor-pointer items-center gap-2 select-none">
      <input
        id={inputId}
        type="checkbox"
        bind:checked={boolValue}
        {disabled}
        class="h-5 w-5 rounded-sm border border-white/20 bg-white/10 accent-purple-500"
      />
      <span>{boolValue ? '是' : '否'}</span>
    </label>
  {:else if param.type === ParameterType.Enum}
    <EnumSelect bind:value {inputId} options={param.enumOptions || []} {disabled} />
  {:else if param.type === ParameterType.File}
    <FilePicker bind:value={stringValue} {inputId} mode="file" {disabled} />
  {:else if param.type === ParameterType.Directory}
    <FilePicker bind:value={stringValue} {inputId} mode="directory" {disabled} />
  {:else if param.type === ParameterType.StringArray}
    <textarea
      id={inputId}
      bind:value
      {disabled}
      placeholder="每行一个值"
      class="min-h-20 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 placeholder:text-white/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:opacity-50"
    ></textarea>
  {:else if param.type === ParameterType.NumberArray}
    <textarea
      id={inputId}
      bind:value
      {disabled}
      placeholder="每行一个数字"
      class="min-h-20 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 placeholder:text-white/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:opacity-50"
    ></textarea>
  {/if}
</div>

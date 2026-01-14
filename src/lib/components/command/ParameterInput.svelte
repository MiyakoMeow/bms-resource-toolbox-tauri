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

<div class="param-input">
  <label class="param-label" for={inputId}>
    {#if param.required}
      <span class="required">*</span>
    {/if}
    {param.name}
  </label>

  <p class="param-desc">{param.description}</p>

  {#if param.type === ParameterType.String}
    <input
      id={inputId}
      type="text"
      bind:value
      {disabled}
      placeholder="请输入..."
      class="input-text"
    />
  {:else if param.type === ParameterType.Number}
    <input id={inputId} type="number" bind:value {disabled} class="input-text" />
  {:else if param.type === ParameterType.Boolean}
    <label class="checkbox-label">
      <input
        id={inputId}
        type="checkbox"
        bind:checked={boolValue}
        {disabled}
        class="input-checkbox"
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
    <textarea id={inputId} bind:value {disabled} placeholder="每行一个值" class="input-textarea"
    ></textarea>
  {:else if param.type === ParameterType.NumberArray}
    <textarea id={inputId} bind:value {disabled} placeholder="每行一个数字" class="input-textarea"
    ></textarea>
  {/if}
</div>

<style>
.param-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(255 255 255 / 0.8);
}

.required {
  color: rgb(248 113 113);
}

.param-desc {
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.5);
}

.input-text,
.input-textarea {
  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.9);
}

.input-text::placeholder,
.input-textarea::placeholder {
  color: rgb(255 255 255 / 0.4);
}

.input-text:focus,
.input-textarea:focus {
  outline: none;
  border-color: rgb(192 132 252);
  box-shadow: 0 0 0 2px rgb(192 132 252 / 0.2);
}

.input-text:disabled,
.input-textarea:disabled {
  opacity: 0.5;
}

.input-textarea {
  min-height: 80px;
  resize: vertical;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.input-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  background-color: rgb(255 255 255 / 0.1);
  border: 1px solid rgb(255 255 255 / 0.2);
  accent-color: rgb(192 132 252);
}
</style>

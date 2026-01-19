<script lang="ts">
interface EnumOption {
  value: unknown;
  label: string;
}

interface Props {
  value: unknown;
  options: EnumOption[];
  disabled: boolean;
  inputId?: string;
}

let { value = $bindable(), options, disabled, inputId }: Props = $props();
</script>

<select
  bind:value
  {disabled}
  id={inputId}
  class="w-full cursor-pointer rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white/90 disabled:cursor-not-allowed disabled:opacity-50 [&_option]:bg-black/90 [&_option]:text-white/90"
>
  {#each options as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>

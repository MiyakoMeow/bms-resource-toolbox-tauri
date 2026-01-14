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

<select bind:value {disabled} id={inputId} class="enum-select">
  {#each options as option}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>

<style>
.enum-select {
  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.9);
  cursor: pointer;
}

.enum-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.enum-select option {
  background-color: rgb(0 0 0 / 0.9);
  color: rgb(255 255 255 / 0.9);
}
</style>

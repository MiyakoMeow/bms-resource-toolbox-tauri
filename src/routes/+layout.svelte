<script lang="ts">
import type { Snippet } from 'svelte';
import '../main.css';

const { children }: { children: Snippet } = $props();
</script>

{@render children()}

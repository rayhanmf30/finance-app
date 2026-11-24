<script lang="ts">
	import { paths, type IconName } from './icon-paths';

	interface Props {
		name: IconName;
		class?: string;
		/** stroke-width SVG, default 2. */
		weight?: number;
	}

	let { name, class: className = 'h-4 w-4', weight = 2 }: Props = $props();
</script>

<svg class={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={weight} aria-hidden="true">
	<path stroke-linecap="round" stroke-linejoin="round" d={paths[name] ?? ''} />
</svg>

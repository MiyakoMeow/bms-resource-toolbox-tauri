<script lang="ts">
import type { Snippet } from 'svelte';
import '../main.css';

const { children }: { children: Snippet } = $props();

// 生成随机星星位置
const stars = Array.from({ length: 100 }, (_, i) => {
	const size = Math.random();
	let sizeClass = 'star-sm';
	let duration = 2 + Math.random() * 3;
	let delay = Math.random() * 5;

	if (size > 0.7) {
		sizeClass = 'star-lg';
		duration = 3 + Math.random() * 4;
	} else if (size > 0.4) {
		sizeClass = 'star-md';
		duration = 2.5 + Math.random() * 3.5;
	}

	return {
		id: i,
		left: Math.random() * 100,
		top: Math.random() * 100,
		sizeClass,
		duration,
		delay,
		moveX: (Math.random() - 0.5) * 100, // -50到50px
		moveY: (Math.random() - 0.5) * 100, // -50到50px
		speed: 20 + Math.random() * 20, // 20-40秒
		moveDelay: Math.random() * 5 // 0-5秒
	};
});

// 流星状态
let meteors = $state([]);

// 生成流星函数
function createMeteor() {
	const meteor = {
		id: Date.now() + Math.random(),
		startX: Math.random() * 100, // 0-100%
		startY: Math.random() * 30, // 0-30%（从屏幕上半部分开始）
		angle: Math.random() * 30 + 30, // 30-60度（对角线）
		speed: 3 + Math.random() * 4, // 3-7秒（更慢的速度）
		length: 100 + Math.random() * 150 // 拖尾长度 100-250px
	};
	meteors = [...meteors, meteor];

	// 动画结束后移除流星
	setTimeout(() => {
		meteors = meteors.filter((m) => m.id !== meteor.id);
	}, meteor.speed * 1000);
}

// 定时生成流星（2-5秒间隔）
function scheduleMeteor() {
	const delay = 2000 + Math.random() * 3000;
	setTimeout(() => {
		createMeteor();
		scheduleMeteor();
	}, delay);
}

// 启动流星生成
scheduleMeteor();
</script>

<svelte:head>
	<style>
		/* 确保背景显示 */
		:global(body) {
			background: transparent !important;
		}
	</style>
</svelte:head>

<!-- 星空背景层 -->
<div class="starry-background">
	{#each stars as star (star.id)}
		<div
			class="star {star.sizeClass}"
			style="left: {star.left}%; top: {star.top}%; --duration: {star.duration}s; --delay: {star.delay}s; --move-x: {star.moveX}px; --move-y: {star.moveY}px; --speed: {star.speed}s; --move-delay: {star.moveDelay}s;"
			aria-hidden="true"
		></div>
	{/each}

	<!-- 流星 -->
	{#each meteors as meteor (meteor.id)}
		<div
			class="meteor"
			style="
				--start-x: {meteor.startX}%;
				--start-y: {meteor.startY}%;
				--angle: {meteor.angle}deg;
				--speed: {meteor.speed}s;
				--length: {meteor.length}px;
			"
			aria-hidden="true"
		></div>
	{/each}
</div>

<!-- 玻璃板内容容器 - 铺满整个窗口，添加明显边框 -->
<div
	class="fixed inset-0 z-50 m-0 overflow-hidden rounded-xl border-2 border-white/20 bg-white/[0.02] backdrop-blur-[2px] shadow-2xl dark:border-white/20 dark:bg-white/[0.02]"
>
	{@render children()}
</div>

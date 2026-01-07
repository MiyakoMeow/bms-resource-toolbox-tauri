<script lang="ts">
import type { Snippet } from 'svelte';
import '../main.css';

const { children }: { children: Snippet } = $props();

// 流星类型定义
interface Meteor {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  length: number;
}

// 生成随机星星位置
const stars = Array.from({ length: 100 }, (_, i) => {
  const size = Math.random();
  let sizeClasses = '';
  let duration = 2 + Math.random() * 3;
  let delay = Math.random() * 5;

  if (size > 0.7) {
    sizeClasses =
      'w-[5px] h-[5px] shadow-[0_0_8px_rgba(255,255,255,1)] light:shadow-[0_0_6px_rgba(100,149,237,0.5)]';
    duration = 3 + Math.random() * 4;
  } else if (size > 0.4) {
    sizeClasses = 'w-[4px] h-[4px]';
    duration = 2.5 + Math.random() * 3.5;
  } else {
    sizeClasses = 'w-[3px] h-[3px]';
  }

  return {
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    sizeClasses,
    duration,
    delay,
    moveX: (Math.random() - 0.5) * 100, // -50到50px
    moveY: (Math.random() - 0.5) * 100, // -50到50px
    speed: 20 + Math.random() * 20, // 20-40秒
    moveDelay: Math.random() * 5, // 0-5秒
  };
});

// 流星状态
let meteors = $state<Meteor[]>([]);

// 生成流星函数
function createMeteor() {
  const meteor = {
    id: Date.now() + Math.random(),
    startX: Math.random() * 100, // 0-100%
    startY: Math.random() * 30, // 0-30%（从屏幕上半部分开始）
    angle: Math.random() * 30 + 30, // 30-60度（对角线）
    speed: 3 + Math.random() * 4, // 3-7秒（更慢的速度）
    length: 100 + Math.random() * 150, // 拖尾长度 100-250px
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
<!-- eslint-disable better-tailwindcss/no-unregistered-classes -->
<div
  class="light:bg-[linear-gradient(to_bottom,#e8f4fc_0%,#d4e9f7_50%,#c5dff0_100%)] fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(to_bottom,#0a0e27_0%,#1a1a3e_50%,#0d0d1a_100%)]"
>
  {#each stars as star (star.id)}
    <div
      class="light:bg-[rgba(100,149,237,0.6)] absolute rounded-full bg-white opacity-100 will-change-[opacity,transform] {star.sizeClasses}"
      style="left: {star.left}%; top: {star.top}%; --duration: {star.duration}s; --delay: {star.delay}s; --move-x: {star.moveX}px; --move-y: {star.moveY}px; --speed: {star.speed}s; --move-delay: {star.moveDelay}s; animation: twinkle var(--duration) ease-in-out infinite, float var(--speed) ease-in-out infinite; animation-delay: var(--delay), var(--move-delay);"
      aria-hidden="true"
    ></div>
  {/each}

  <!-- 流星 -->
  {#each meteors as meteor (meteor.id)}
    <div
      class="meteor light:bg-[rgba(100,149,237,0.9)] light:shadow-[0_0_6px_2px_rgba(100,149,237,0.6),0_0_15px_5px_rgba(100,149,237,0.3)] absolute top-0 left-0 z-1 h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.8),0_0_15px_5px_rgba(255,255,255,0.5)] will-change-[transform,opacity]"
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
  <!-- eslint-enable better-tailwindcss/no-unregistered-classes -->
</div>

<!-- 玻璃板内容容器 - 铺满整个窗口，添加明显边框 -->
<div
  class="fixed inset-0 z-50 m-0 overflow-hidden rounded-xl border-2 border-white/20 bg-white/2 shadow-2xl backdrop-blur-[2px] dark:border-white/20 dark:bg-white/2"
>
  {@render children()}
</div>

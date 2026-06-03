<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Stamp {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const isMounted = ref(false)
const isHovering = ref(false)
const stamps = ref<Stamp[]>([])
const cursorRef = ref<HTMLDivElement | null>(null)
const stampId = ref(0)

onMounted(() => {
  isMounted.value = true

  const handleMouseMove = (e: MouseEvent) => {
    if (cursorRef.value) {
      cursorRef.value.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`
    }
  }

  const handleMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target) return
    
    const isInteractive = 
      target.tagName === "A" || 
      target.tagName === "BUTTON" || 
      target.closest("a") || 
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.classList.contains("cursor-zoom-in") ||
      target.classList.contains("cursor-zoom-out")
    
    isHovering.value = !!isInteractive
  }

  const handleMouseDown = () => {
    if (cursorRef.value) {
      cursorRef.value.style.transform += " scale(0.85)"
    }
  }

  const handleMouseUp = () => {
    if (cursorRef.value) {
      cursorRef.value.style.transform = cursorRef.value.style.transform.replace(" scale(0.85)", "")
    }
  }

  const handleClick = (e: MouseEvent) => {
    const newStamp: Stamp = {
      id: stampId.value++,
      x: e.clientX,
      y: e.clientY,
      scale: 0.8 + Math.random() * 0.4,
      rotation: (Math.random() - 0.5) * 30,
    }

    stamps.value.push(newStamp)

    setTimeout(() => {
      stamps.value = stamps.value.filter((s) => s.id !== newStamp.id)
    }, 700)
  }

  window.addEventListener("mousemove", handleMouseMove)
  window.addEventListener("mouseover", handleMouseOver)
  window.addEventListener("mousedown", handleMouseDown)
  window.addEventListener("mouseup", handleMouseUp)
  window.addEventListener("click", handleClick)

  onUnmounted(() => {
    window.removeEventListener("mousemove", handleMouseMove)
    window.removeEventListener("mouseover", handleMouseOver)
    window.removeEventListener("mousedown", handleMouseDown)
    window.removeEventListener("mouseup", handleMouseUp)
    window.removeEventListener("click", handleClick)
  })
})
</script>

<template>
  <template v-if="isMounted">
    <!-- Pressed Stamp Trail / Marks -->
    <div
      v-for="stamp in stamps"
      :key="stamp.id"
      class="pointer-events-none fixed z-[9999] text-burnt-orange/70 mix-blend-multiply animate-stamp-fade"
      :style="{
        left: stamp.x + 'px',
        top: stamp.y + 'px',
        transform: `translate(-50%, -50%) rotate(${stamp.rotation}deg) scale(${stamp.scale})`,
      }"
    >
      <!-- Heart Stamp Mark SVG -->
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="filter drop-shadow-[0_1px_2px_rgba(181,78,36,0.3)]"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>

    <!-- Main Cursor Element -->
    <div
      ref="cursorRef"
      class="pointer-events-none fixed top-0 left-0 w-8 h-8 z-[9999] transition-colors duration-200 select-none mix-blend-normal hidden md:block"
      :class="isHovering ? 'text-burnt-orange' : 'text-muted-mauve'"
      style="transform: translate3d(-100px, -100px, 0);"
    >
      <!-- Hand-drawn look heart stamp pointer -->
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-full h-full transform transition-transform duration-200"
        :class="isHovering ? 'scale-125 rotate-6' : ''"
      >
        <!-- Outer slightly irregular heart path -->
        <path
          fill="currentColor"
          :fill-opacity="isHovering ? '0.9' : '0.7'"
          d="M12 20.5l-1.25-1.15C6.2 15.1 3 12.3 3 8.8 3 6 5 4 7.8 4c1.6 0 3.1.8 4.2 2 1.1-1.2 2.6-2 4.2-2C19 4 21 6 21 8.8c0 3.5-3.2 6.3-7.75 10.55L12 20.5z"
        />
        <!-- Subtle wood stamp block handle lines inside -->
        <path d="M12 8v4" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
      </svg>
    </div>
  </template>
</template>

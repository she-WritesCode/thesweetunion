<script setup lang="ts">
interface TimelineItem {
  key: string;
  label: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

defineProps<TimelineProps>()

const emit = defineEmits<{
  (e: 'imageClick', url: string): void
}>()

const collageStyles = [
  {
    rotation: "rotate-[-3deg]",
    tapeRotation: "rotate-[-10deg] left-[25%] top-[-14px]",
    tapeColor: "washi-tape-terracotta",
    marginOffset: "translate-y-2 lg:translate-x-4",
  },
  {
    rotation: "rotate-[4deg]",
    tapeRotation: "rotate-[8deg] right-[25%] top-[-12px]",
    tapeColor: "washi-tape-gold",
    marginOffset: "-translate-y-4 lg:-translate-x-4",
  },
  {
    rotation: "rotate-[-2deg]",
    tapeRotation: "rotate-[-5deg] left-[30%] top-[-16px]",
    tapeColor: "washi-tape",
    marginOffset: "translate-y-4 lg:translate-x-2",
  },
  {
    rotation: "rotate-[3deg]",
    tapeRotation: "rotate-[12deg] right-[30%] top-[-10px]",
    tapeColor: "washi-tape-terracotta",
    marginOffset: "-translate-y-2 lg:-translate-x-2",
  },
]
</script>

<template>
  <div class="w-full max-w-6xl mx-auto py-12 px-4 select-text">
    <!-- Scattered overlapping grid of Polaroid memories -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 relative">
      <div
        v-for="(item, index) in items"
        :key="item.key"
        class="relative z-10 w-full max-w-md mx-auto select-none transition-all duration-500 hover:z-20 hover:scale-[1.03]"
        :class="[
          collageStyles[index % collageStyles.length].rotation,
          collageStyles[index % collageStyles.length].marginOffset
        ]"
      >
        <!-- Piece of washi tape holding this Polaroid memory -->
        <div 
          class="washi-tape absolute" 
          :class="[
            collageStyles[index % collageStyles.length].tapeRotation,
            collageStyles[index % collageStyles.length].tapeColor
          ]"
        />

        <!-- The Polaroid Card -->
        <div class="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 flex flex-col">
          <!-- Photo frame -->
          <div class="relative aspect-[4/3] w-full overflow-hidden bg-deep-espresso/5 rounded-sm border border-deep-espresso/10 cursor-zoom-in">
            <img
              :src="item.imageUrl"
              :alt="item.title"
              class="img-fill"
              @click="emit('imageClick', item.imageUrl)"
            />
            <!-- Subtle shadows & paper details on photo -->
            <div class="absolute inset-0 bg-gradient-to-t from-deep-espresso/10 to-transparent pointer-events-none" />
          </div>

          <!-- Handwritten diary entry description -->
          <div class="mt-5 space-y-2.5 text-deep-espresso text-left select-text">
            <div class="flex items-center justify-between border-b border-amber-gold/15 pb-1">
              <span class="font-display-cormorant text-2xl font-bold text-deep-terracotta">
                {{ item.title }}
              </span>
              <span class="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase">
                {{ item.label }}
              </span>
            </div>
            <p class="font-body text-base text-deep-espresso/80 leading-relaxed italic">
              "{{ item.description }}"
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

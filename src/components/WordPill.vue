<template>
  <div
    class="word-pill transition-base shadow-sm"
    :class="[
      pillStyles.theme,
      stateClasses,
      clickClasses,
      { 'is-merge-target': isMergeTarget },
      { 'is-connected-left': isConnectedLeft },
      { 'is-connected-right': isConnectedRight }
    ]"
    @pointerdown="$emit('down', $event)"
  >
    <div v-if="data.leftConn !== null" class="port port-l" :class="{ 'is-connected': isConnectedLeft }">
      <div
        v-for="idx in getSegments(data.leftConn)"
        :key="idx"
        class="segment"
        :style="getSegmentStyle(data.leftConn, isConnectedLeft)"
      ></div>
    </div>

    <div class="pill-content row items-center no-wrap relative-position full-height q-px-md">
      <q-icon v-if="data.type === 'mystery' && data.hidden" name="help_outline" size="xs" />
      <span v-else class="word-text text-weight-bold">{{ data.text }}</span>
      <q-icon v-if="pillStyles.icon" :name="pillStyles.icon" size="10px" class="absolute-top-right q-ma-xs opacity-40" />
    </div>

    <div v-if="data.rightConn !== null" class="port port-r" :class="{ 'is-connected': isConnectedRight }">
      <div
        v-for="idx in getSegments(data.rightConn)"
        :key="idx"
        class="segment"
        :style="getSegmentStyle(data.rightConn, isConnectedRight)"
      ></div>
    </div>

    <div v-if="data.type === 'splitter'" class="splitter-separator"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  isDragged: Boolean,
  isMergeTarget: Boolean,
  isConnectedLeft: Boolean,
  isConnectedRight: Boolean,
  isPulsing: Boolean,
  isDropped: Boolean
})

defineEmits(['down'])

const getSegments = (connType) => {
  if (connType === 1) return 1 // Сплошная
  if (connType === 2) return 2 // Две части
  if (connType === 3) return 3 // Три точки
  return 0
}

const getSegmentStyle = (connType, isConnected) => {
  let height = '4px'
  if (connType === 1) height = '16px'
  if (connType === 2) height = '7px'
  if (connType === 3) height = '4px'
  return {
    height,
    background: isConnected ? '#5ace8d' : '#d0d0d0',
  }
}

const TYPE_CONFIG = {
  mirror:      { theme: 'bg-white text-purple-9 border-purple', icon: 'swap_horiz' },
  mystery:     { theme: 'bg-white text-grey-6 border-grey-4 mystery-style', icon: null },
  merger:      { theme: 'bg-white text-green-9 border-green-light', icon: 'auto_fix_high' },
  splitter:    { theme: 'bg-white text-purple-9 border-purple-dashed', icon: 'content_cut' },
  transformer: { theme: 'bg-white text-primary border-blue', icon: 'refresh' },
  static:      { theme: 'bg-white text-grey-9 text-h6 border-none bg-transparent', icon: null },
  standard:    { theme: 'bg-white text-dark border-grey-4', icon: null }
}

const pillStyles = computed(() => {
  const cfg = TYPE_CONFIG[props.data.type] || (props.data.forms ? TYPE_CONFIG.transformer : TYPE_CONFIG.standard)
  return (props.data.type === 'mystery' && !props.data.hidden) ? { theme: 'bg-white text-dark border-grey-4', icon: null } : cfg
})

const stateClasses = computed(() => ({
  'ghost-pill': props.isDragged,
  'anim-rubber': props.isDropped,
  'cursor-pointer': !props.data.static,
  'static-pill': props.data.static
}))

const clickClasses = computed(() => ({
  'anim-mirror': props.isPulsing && props.data.type === 'mirror',
  'anim-shake-y': props.isPulsing && props.data.type === 'transformer',
  'anim-shake-y': props.isPulsing
}))
</script>

<style lang="scss" scoped>
$active-glow: #06b664;

.word-pill {
  height: 40px;
  min-width: 54px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 0 8px;
  margin: 0 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  .word-text { font-size: 1rem; font-weight: 600; color: #2c3e50; z-index: 2; }

  .port {
    position: absolute;
    width: 4px;
    height: 24px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2px;
    z-index: 5;
    transition: all 0.3s ease;

    &.port-l { left: 4px; }
    &.port-r { right: 4px; }

    .segment {
      width: 100%;
      border-radius: 2px;
      transition: all 0.3s ease;
    }
  }

  // --- СОСТОЯНИЯ СОЕДИНЕНИЯ ---
  &.is-connected-left {
    margin-left: 1px;
    border-top-left-radius: 7px;
    border-bottom-left-radius: 7px;
  }

  &.is-connected-right {
    margin-right: 1px;
    border-top-right-radius: 7px;
    border-bottom-right-radius: 7px;
  }

  &.is-merge-target {
    border-color: $active-glow;
    transform: scale(1.05);
    z-index: 10;
  }

  &.ghost-pill { opacity: 0.4; border-style: dashed; }
  &.static-pill { min-width: unset; padding: 0 4px; margin: 0 !important; }
}

</style>

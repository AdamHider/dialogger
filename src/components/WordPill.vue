<template>
  <div
    class="word-pill transition-base shadow-sm"
    :class="[
      pillStyles.theme, 
      stateClasses,
      { 'is-merge-target': isMergeTarget },
      { 'is-connected-left': isConnectedLeft },
      { 'is-connected-right': isConnectedRight }
    ]"
    :data-l-conn="data.leftConn"
    :data-r-conn="data.rightConn"
    @pointerdown="$emit('down', $event)"
  >
    <div 
      v-if="data.leftConn !== null"
      class="port port-l" 
      :class="{ 'is-connected': isConnectedLeft }"
    ></div>

    <div class="row items-center no-wrap relative-position full-height q-px-md">
      <q-icon v-if="data.type === 'mystery' && data.hidden" name="help_outline" size="xs" />
      <span v-else class="word-text text-weight-bold">{{ data.text }}</span>
      
      <q-icon
        v-if="pillStyles.icon"
        :name="pillStyles.icon"
        size="10px"
        class="absolute-top-right q-ma-xs opacity-40"
      />
    </div>

    <div 
      v-if="data.rightConn !== null"
      class="port port-r" 
      :class="{ 'is-connected': isConnectedRight }"
    ></div>
    
    <div v-if="data.type === 'splitter'" class="splitter-separator"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  isDragged: Boolean,
  isMergeTarget: Boolean,   // Подсветка при наведении совместимого блока
  isConnectedLeft: Boolean, // Успешный стык слева
  isConnectedRight: Boolean, // Успешный стык справа
  isPulsing: Boolean,
  isDropped: Boolean
})

defineEmits(['down'])

const TYPE_CONFIG = {
  mirror:      { theme: 'bg-purple-1 text-purple-9 border-purple', icon: 'swap_horiz' },
  mystery:     { theme: 'bg-grey-3 text-grey-6 border-grey-4 mystery-style', icon: null },
  merger:      { theme: 'bg-green-1 text-green-9 border-green-light', icon: 'auto_fix_high' },
  splitter:    { theme: 'bg-purple-1 text-purple-9 border-purple-dashed', icon: 'content_cut' },
  transformer: { theme: 'bg-blue-1 text-primary border-blue', icon: 'refresh' },
  static:      { theme: 'text-grey-9 text-h6 border-none bg-transparent', icon: null },
  standard:    { theme: 'bg-white text-dark border-grey-4', icon: null }
}

const pillStyles = computed(() => {
  const cfg = TYPE_CONFIG[props.data.type] ||
              (props.data.forms ? TYPE_CONFIG.transformer : TYPE_CONFIG.standard)
  if (props.data.type === 'mystery' && !props.data.hidden) {
    return { theme: 'bg-white text-dark border-grey-4', icon: null }
  }
  return cfg
})
const stateClasses = computed(() => ({
  'ghost-pill': props.isDragged,
  'anim-shake-y': props.isPulsing,
  'anim-rubber': props.isDropped,
  'cursor-pointer': !props.data.static,
  'static-pill': props.data.static
}))
</script>

<style lang="scss" scoped>
.word-pill {
  height: 44px;
  min-width: 54px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid #e0e0e0; // Утолщенная рамка для веса
  border-radius: 10px;
  margin: 0 6px; 
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  // Цвета полюсов (максимально контрастные)
  $mag-red: #ff3333;
  $mag-blue: #0077ff;
  $mag-yellow: #ffbb00;
  $mag-green: #00cc44;

  .port {
    position: absolute;
    width: 6px;
    height: 16px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    transition: all 0.3s ease;
    border-radius: 3px;
    
    // Полюс всегда яркий и читабельный
    opacity: 1;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);

    &.port-l { left: -4px; } // Порт выступает наружу для лучшей видимости
    &.port-r { right: -4px; }
  }

  // --- ЯРКАЯ ЦВЕТОВАЯ ИДЕНТИФИКАЦИЯ ---
  &[data-l-conn="1"] .port-l, &[data-r-conn="1"] .port-r { background: $mag-red; }
  &[data-l-conn="2"] .port-l, &[data-r-conn="2"] .port-r { background: $mag-blue; }
  &[data-l-conn="3"] .port-l, &[data-r-conn="3"] .port-r { background: $mag-yellow; }
  &[data-l-conn="4"] .port-l, &[data-r-conn="4"] .port-r { background: $mag-green; }

  // --- ЭФФЕКТ ПРИМАГНИЧИВАНИЯ (СЦЕПКА) ---

  // Магнитный замок слева
  &.is-connected-left {
    margin-left: 0px; // "Втягивание"
    
    .port-l {
      width: 4px;
      left: -2px;
      border-radius: 0;
    }
  }

  // Магнитный замок справа
  &.is-connected-right {
    margin-right: 0px;
    
    .port-r {
      width: 4px;
      right: -2px;
      border-radius: 0;
    }
  }

  // Индикация при перетаскивании (Force Field)
  &.is-merge-target {
    border-color: currentColor; // Рамка окрашивается в цвет порта
    transform: scale(1.05);
    z-index: 10;
    
    .port {
      height: 24px; // Порт "оживает", когда рядом пара
      box-shadow: 0 0 8px currentColor;
    }
  }
}

// Убираем лишние отступы у знаков препинания, чтобы они плотнее магнитились
.static-pill {
  min-width: 30px !important;
  margin: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
}
</style>
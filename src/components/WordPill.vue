<template>
  <div
    class="word-pill q-px-md q-py-sm rounded-borders text-weight-bold transition-base shadow-sm"
    :class="[pillStyles.theme, stateClasses]"
    @pointerdown="$emit('down', $event)"
  >
    <div class="row items-center no-wrap relative-position">
      <q-icon v-if="data.type === 'mystery' && data.hidden" name="help_outline" size="xs" />
      <span v-else class="word-text">{{ data.text }}</span>

      <q-icon
        v-if="pillStyles.icon"
        :name="pillStyles.icon"
        size="10px"
        class="absolute-top-right q-ma-none opacity-40 translate-tr"
      />
    </div>

    <div v-if="data.type === 'splitter'" class="splitter-separator"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  isDragged: Boolean,
  isTarget: Boolean,
  isPulsing: Boolean,
  isDropped: Boolean
})

defineEmits(['down'])

const TYPE_CONFIG = {
  mirror:     { theme: 'bg-purple-1 text-purple-9 border-purple', icon: 'swap_horiz' },
  mystery:    { theme: 'bg-grey-3 text-grey-6 border-grey-4 mystery-style', icon: null },
  merger:     { theme: 'bg-green-1 text-green-9 border-green-light', icon: 'auto_fix_high' },
  splitter:   { theme: 'bg-purple-1 text-purple-9 border-purple-dashed', icon: 'content_cut' },
  transformer:{ theme: 'bg-blue-1 text-primary border-blue', icon: null },
  standart:   { theme: 'bg-white', icon: null }
}

const pillStyles = computed(() => {
  const cfg = TYPE_CONFIG[props.data.type] ||
              (props.data.forms ? TYPE_CONFIG.transformer : TYPE_CONFIG.standart)

  // Для скрытых слов меняем тему на обычную, если они раскрыты
  if (props.data.type === 'mystery' && !props.data.hidden) {
    return { theme: 'bg-white text-dark border-grey-4', icon: null }
  }

  return cfg
})

const stateClasses = computed(() => ({
  'ghost-pill': props.isDragged,
  'is-merge-target': props.isTarget,
  'anim-shake-y': props.isPulsing,
  'anim-rubber': props.isDropped,
  'cursor-pointer': !props.data.static,
  'static-pill': props.data.static
}))
</script>

<style lang="scss" scoped>
.word-pill {
  border: 1px solid #e0e0e0;
  position: relative;
  touch-action: none;
  user-select: none;
  white-space: nowrap;

  &.no-pointer { pointer-events: none; }
  &.translate-tr { transform: translate(8px, -8px); }

  // Специфические бордеры
  &.border-blue { border-color: $primary; }
  &.border-purple { border-color: $purple-4; }
  &.border-purple-dashed { border: 1px dashed $purple-4; }
  &.border-green-light { border-color: $green-4; }
  &.static-pill { background: transparent; border: none; padding: 10px 4px; font-size: 1.4em; color: #444; }
  &.ghost-pill { opacity: 0.3 !important; }
}

.mystery-style {
  font-style: italic;
  background-image: radial-gradient(#bdbdbd 10%, transparent 10%);
  background-size: 8px 8px;
}

.splitter-separator {
  position: absolute;
  left: 50%; top: 20%; bottom: 20%;
  width: 1px;
  border-left: 1px dashed rgba(156, 39, 176, 0.3);
  transform: translateX(-50%);
}

.is-merge-target {
  transform: scale(1.15);
  border: 2px solid $green-6 !important;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.4);
  z-index: 10;
}
</style>

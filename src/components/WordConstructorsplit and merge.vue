<template>
  <div class="word-constructor-container column bg-white border-top no-select overflow-hidden">

    <transition name="phantom-fly">
      <div v-if="isDragging && draggedIdx !== null"
           class="word-pill phantom-pill fixed z-max shadow-10 text-weight-bold q-px-md q-py-sm rounded-borders"
           :class="getPillTheme(modelValue[draggedIdx], true)"
           :style="phantomStyle">
        {{ modelValue[draggedIdx]?.text }}
      </div>
    </transition>

    <div class="row items-center q-px-md q-py-xs">
      <q-btn flat round dense color="grey-7" icon="refresh" size="sm"
             :disable="resetsLeft <= 0 || !modelValue.length || isExploding" @click="resetConstructor">
        <q-badge v-if="resetsLeft < 3" color="primary" floating transparent>{{ resetsLeft }}</q-badge>
      </q-btn>
      <div class="text-caption text-grey-6 q-ml-sm">Конструктор</div>
    </div>

    <div class="q-px-md q-pb-md">
      <div class="words-container q-pa-md relative-position justify-center row">
        <transition-group name="words" tag="div" class="row justify-center items-center" style="gap: 8px;">
          <div v-for="(word, index) in modelValue" :key="word.id" :data-index="index"
               class="word-wrapper q-pa-xs" :class="{ 'anim-explode': isExploding }">

            <div class="word-pill q-px-md q-py-sm rounded-borders text-weight-bold transition-base shadow-sm"
                 :class="[
                   getPillClass(word, index),
                   { 'is-merge-target': targetMergeIdx === index }
                 ]"
                 @pointerdown="onPointerDown($event, index)">

              <div class="row items-center no-wrap relative-position">
                <span class="word-text">{{ word.text }}</span>

                <q-icon v-if="word.type === 'merger'"
                        name="auto_fix_high"
                        size="10px"
                        class="q-ml-xs opacity-40" />

                <q-icon v-if="word.type === 'splitter'"
                        name="content_cut"
                        size="10px"
                        class="q-ml-xs opacity-40" />
              </div>

              <div v-if="word.type === 'splitter'" class="splitter-separator"></div>
            </div>
          </div>
        </transition-group>
      </div>

      <div class="q-mt-md relative-position">
        <transition name="fade-fast" mode="out-in">
          <div v-if="isDragging" id="trash-bin"
               class="action-box flex flex-center full-width rounded-borders border-dashed transition-base"
               :class="isOverTrash ? 'bg-red-1 text-red border-red scale-102' : 'bg-grey-1 text-grey-6'">
            <q-icon :name="isOverTrash ? 'delete_sweep' : 'delete_outline'" size="sm" />
            <span class="q-ml-sm text-weight-bolder uppercase">Удалить</span>
          </div>

          <q-btn v-else unelevated color="primary" class="action-box full-width text-weight-bolder"
                 icon-right="send" label="ОТПРАВИТЬ"
                 :disable="!modelValue?.length || isExploding" @click="$emit('submit')" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useWordDrag } from '../composables/useWordDrag'

const props = defineProps({ modelValue: Array })
const emit = defineEmits(['update:modelValue', 'submit'])

const resetsLeft = ref(3)
const isExploding = ref(false)
const pulsingId = ref(null)
const lastDroppedId = ref(null)

const {
  isDragging,
  draggedIdx,
  targetMergeIdx,
  isOverTrash,
  phantomStyle,
  onPointerDown
} = useWordDrag(
  toRef(props, 'modelValue'),
  {
    onUpdate: (val) => emit('update:modelValue', val),
    onFormChange: (idx) => {
      // Клонируем массив для соблюдения реактивности
      const words = JSON.parse(JSON.stringify(props.modelValue))
      const w = words[idx]
      let changed = false

      // РАЗБИЕНИЕ
      if (w.type === 'splitter' && w.originalParts) {
        const restored = w.originalParts.map(p => ({
          ...p,
          id: Math.random() + Date.now()
        }))
        words.splice(idx, 1, ...restored)
        changed = true
      }
      // ТРАНСФОРМАЦИЯ
      else if (w.forms) {
        const cur = w.forms.indexOf(w.text)
        w.text = w.forms[(cur + 1) % w.forms.length]
        changed = true
      }

      if (changed) {
        emit('update:modelValue', words)
        navigator.vibrate?.(10)
      }
    },
    onDropSuccess: (id) => {
      lastDroppedId.value = id
      setTimeout(() => lastDroppedId.value = null, 400)
    }
  }
)

const getPillTheme = (word, isPhantom = false) => {
  if (!word) return ''
  if (isDragging.value && isOverTrash.value && isPhantom) return 'bg-red text-white border-none'

  if (word.type === 'merger') return 'bg-green-1 text-green-9 border-green-light'
  if (word.type === 'splitter') return 'bg-purple-1 text-purple-9 border-purple-dashed'
  if (word.forms) return 'bg-blue-1 text-primary border-blue'

  return 'bg-white text-dark border-grey-4'
}

const getPillClass = (word, index) => {
  if (word.static) return 'text-grey-9 text-h6 q-px-xs border-none bg-transparent pointer-events-none'

  const theme = getPillTheme(word)
  return [
    theme,
    {
      'invisible': isDragging.value && draggedIdx.value === index,
      'anim-shake-y': pulsingId.value === word.id,
      'anim-rubber': lastDroppedId.value === word.id,
      'cursor-pointer': true
    }
  ]
}

const resetConstructor = () => {
  isExploding.value = true
  setTimeout(() => {
    emit('update:modelValue', [])
    isExploding.value = false
    resetsLeft.value--
  }, 400)
}
</script>

<style lang="scss" scoped>
.no-select { user-select: none; -webkit-user-select: none; touch-action: none; }
.transition-base { transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1); }

.word-pill {
  border: 1px solid #e0e0e0;
  position: relative;
  touch-action: none;

  &.border-blue { border-color: $primary; }
  &.border-green-light { border-color: $green-4; }
  &.border-purple-dashed { border: 1px dashed $purple-4; }
  &.border-none { border-color: transparent; }
  &.invisible { opacity: 0; pointer-events: none; }

  // СТИЛЬ ПОДСВЕТКИ ПРИ НАВЕДЕНИИ ДЛЯ СКЛЕЙКИ
  &.is-merge-target {
    transform: scale(1.15);
    background-color: #f1f8e9 !important;
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.4);
    z-index: 10;
  }
}

.splitter-separator {
  position: absolute;
  left: 50%;
  top: 25%;
  bottom: 25%;
  width: 1px;
  border-left: 1px dashed rgba(156, 39, 176, 0.4);
  transform: translateX(-50%);
  pointer-events: none;
}

.phantom-pill {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  will-change: left, top, transform;
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
  transform: scale(1.1);
}

.action-box { height: 52px; border-radius: 12px; }
.border-dashed { border: 2px dashed #ccc; &.border-red { border-color: $red; } }
.scale-102 { transform: scale(1.02); }

// Анимация перемещения (когда блоки раздвигаются)
.words-move {
  transition: transform 0.3s cubic-bezier(0.2, 1, 0.2, 1);
}

// Анимация появления новых частей
.words-enter-active {
  transition: all 0.2s ease-out;
}
.words-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

// ВАЖНО: Анимация исчезновения (удаления)
.words-leave-active {
  // Ставим position: absolute, чтобы блок не занимал место в потоке во время анимации
  position: absolute;
  // Убираем длительность анимации, чтобы он исчезал моментально
  transition: none !important;
  opacity: 0;
}
.anim-explode {
  opacity: 0; pointer-events: none;
  &:nth-child(even) { transform: translate(60px, -120px) rotate(15deg) scale(0); transition: all 0.4s ease-in; }
  &:nth-child(odd) { transform: translate(-60px, -120px) rotate(-15deg) scale(0); transition: all 0.4s ease-in; }
}

.anim-shake-y { animation: shakeY 0.4s both; }
.anim-rubber { animation: rubber 0.4s linear; }

@keyframes shakeY {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-5px); }
  75% { transform: translateY(3px); }
}

@keyframes rubber {
  0% { transform: scale3d(1, 1, 1); }
  30% { transform: scale3d(1.15, 0.85, 1); }
  50% { transform: scale3d(0.95, 1.05, 1); }
  100% { transform: scale3d(1, 1, 1); }
}

.phantom-fly-enter-active { animation: pop-up 0.25s cubic-bezier(0.2, 1, 0.3, 1.2); }
.phantom-fly-leave-active { transition: all 0.2s ease-in; opacity: 0; transform: scale(0.5) translateY(20px); }

@keyframes pop-up {
  0% { transform: scale(0.9) translateY(20px); opacity: 0; }
  100% { transform: scale(1.1) translateY(0); opacity: 1; }
}
</style>

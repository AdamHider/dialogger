<template>
  <div class="word-constructor-container column bg-white border-top no-select overflow-hidden">

    <transition name="phantom-fly">
      <div v-if="isDragging && draggedIdx !== null"
           class="word-pill phantom-pill fixed z-max shadow-10 text-weight-bold q-px-md q-py-sm rounded-borders"
           :class="getPillTheme(modelValue[draggedIdx], true)"
           :style="phantomStyle">
        {{ modelValue[draggedIdx]?.hidden ? '?' : modelValue[draggedIdx]?.text }}
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
        <transition-group name="words" tag="div" class="row justify-center items-center">
          <div v-for="(word, index) in modelValue" :key="word.id" :data-index="index"
               class="word-wrapper q-pa-xs" :class="{ 'anim-explode': isExploding }">

            <div class="word-pill q-px-md q-py-sm rounded-borders text-weight-bold transition-base shadow-sm"
                 :class="getPillClass(word, index)"
                 @pointerdown="onPointerDown($event, index)">
              <template v-if="word.type === 'mystery' && word.hidden">
                <q-icon name="help_outline" size="xs" />
              </template>
              <template v-else>
                {{ word.text }}
              </template>

              <q-icon v-if="word.type === 'mirror'" name="swap_horiz" size="10px" class="absolute-top-right q-ma-xs opacity-50" />
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

const { isDragging, draggedIdx, isOverTrash, phantomStyle, onPointerDown } = useWordDrag(
  toRef(props, 'modelValue'),
  {
    onUpdate: (val) => emit('update:modelValue', val),
    onFormChange: (idx) => {
      const words = [...props.modelValue]
      const w = words[idx]
      let changed = false

      // 1. Зеркальный тип (Антонимы)
      if (w.type === 'mirror') {
        w.text = w.text === w.original ? w.opposite : w.original
        changed = true
        navigator.vibrate?.([10, 5, 10])
      }
      // 2. Обычные формы
      else if (w.forms) {
        w.text = w.forms[(w.forms.indexOf(w.text) + 1) % w.forms.length]
        changed = true
        navigator.vibrate?.(5)
      }
      // 3. Тайный тип (раскрытие при клике)
      else if (w.type === 'mystery' && w.hidden) {
        w.hidden = false
        changed = true
        navigator.vibrate?.(10)
      }

      if (changed) {
        pulsingId.value = w.id
        emit('update:modelValue', words)
        setTimeout(() => pulsingId.value = null, 400)
      }
    },
    onDropSuccess: (id) => {
      const words = [...props.modelValue]
      const w = words.find(item => item.id === id)

      // Если бросили тайное слово — раскрываем его
      if (w && w.type === 'mystery' && w.hidden) {
        w.hidden = false
        emit('update:modelValue', words)
      }

      lastDroppedId.value = id
      setTimeout(() => lastDroppedId.value = null, 400)
    }
  }
)

// Вынес логику цветов для переиспользования в фантоме
const getPillTheme = (word, isPhantom = false) => {
  if (!word) return ''
  if (isDragging.value && isOverTrash.value && isPhantom) return 'bg-red text-white'

  if (word.type === 'mirror') return 'bg-purple-1 text-purple-9 border-purple'
  if (word.type === 'mystery' && word.hidden) return 'bg-grey-3 text-grey-6 border-grey-4 mystery-style'
  if (word.forms) return 'bg-blue-1 text-primary border-blue'
  return 'bg-white text-dark border-grey-4'
}

const getPillClass = (word, index) => {
  if (word.static) return 'text-grey-9 text-h6 q-px-xs border-none bg-transparent'

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
  &.border-blue { border-color: $primary; }
  &.border-purple { border-color: $purple-4; }
  &.border-none { border-color: transparent; }
  &.invisible { opacity: 0; pointer-events: none; }
}

.mystery-style {
  font-style: italic;
  background-image: radial-gradient($grey-4 10%, transparent 10%);
  background-size: 10px 10px;
}

.phantom-pill {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  will-change: left, top, transform;
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
  transform: scale(1.1);
  &.scale-80 { transform: scale(0.8) !important; }
}

.border-dashed { border: 2px dashed #ccc; &.border-red { border-color: $red; } }
.action-box { height: 52px; border-radius: 12px; }
.scale-102 { transform: scale(1.02); }

// Плавная перестановка
.words-move { transition: transform 0.4s cubic-bezier(0.2, 1, 0.2, 1); }

// Взрыв при сбросе
.anim-explode {
  opacity: 0; pointer-events: none;
  &:nth-child(even) { transform: translate(60px, -120px) rotate(15deg) scale(0); transition: all 0.4s ease-in; }
  &:nth-child(odd) { transform: translate(-60px, -120px) rotate(-15deg) scale(0); transition: all 0.4s ease-in; }
}

// Анимации
.anim-shake-y { animation: shakeY 0.4s cubic-bezier(.36,.07,.19,.97) both; }
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

@keyframes pop-up {
  0% { transform: scale(0.9) translateY(20px); opacity: 0; }
  100% { transform: scale(1.1) translateY(0); opacity: 1; }
}

.phantom-fly-enter-active { animation: pop-up 0.25s cubic-bezier(0.2, 1, 0.3, 1.2); }
.phantom-fly-leave-active { transition: all 0.2s ease-in; opacity: 0; transform: scale(0.5) translateY(20px); }
</style>

<template>
  <div ref="dragContainer" class="word-constructor-container column bg-white border-top no-select">

    <transition name="phantom-fly">
      <div v-if="isDragging && draggedIdx !== null"
        class="word-pill phantom-pill"
        :class="{ 'pill-to-delete': isOverTrash }"
        :style="phantomStyle">
        {{ modelValue[draggedIdx]?.text }}
      </div>
    </transition>

    <div class="constructor-toolbar row items-center justify-between q-px-md q-py-xs">
      <div class="row items-center q-gutter-x-sm">
        <q-btn flat round dense color="grey-7" icon="refresh" size="sm"
          :disable="resetsLeft <= 0 || !modelValue.length || isExploding" @click="resetConstructor">
          <div v-if="resetsLeft < 3" class="undo-badge-mini">{{ resetsLeft }}</div>
        </q-btn>
        <div class="text-caption text-grey-6 text-weight-medium">Конструктор</div>
      </div>
    </div>

    <div class="q-px-md q-pb-md">
      <div class="words-container q-pa-md relative-position">
        <transition-group name="words" tag="div" class="row justify-center items-center">
          <div v-for="(word, index) in modelValue" :key="word.id" :data-index="index"
            class="word-wrapper row items-center justify-center"
            :class="{ 'anim-explode': isExploding }">

            <div v-if="isDragging && dropTargetIdx === index" class="drop-indicator"></div>

            <div class="word-pill" :class="{
                'is-form': word.forms && !word.static,
                'ghost-word': isDragging && draggedIdx === index,
                'static-pill': word.static,
                'anim-shake-y': pulsingId === word.id,
                'anim-rubber-modest': lastDroppedId === word.id
              }" @pointerdown="onPointerDown($event, index)">
              {{ word.text }}
            </div>
          </div>
        </transition-group>
      </div>

      <div class="action-container q-mt-md relative-position">
        <transition name="fade-fast" mode="out-in">
          <div v-if="isDragging" key="trash" id="trash-bin"
               class="action-box trash-zone flex flex-center full-width" :class="{ 'trash-active': isOverTrash }">
            <q-icon :name="isOverTrash ? 'delete_sweep' : 'delete_outline'" size="sm" />
            <span class="q-ml-sm text-weight-bold">УДАЛИТЬ</span>
          </div>

          <q-btn v-else key="send" unelevated color="primary" class="action-box full-width"
                 icon-right="send" label="ОТПРАВИТЬ" :disable="!modelValue?.length || isExploding" @click="$emit('submit')" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({ modelValue: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'submit'])

const SENSOR_OFFSET = 35
const LONG_PRESS_DELAY = 150

const lastDroppedId = ref(null)
const pulsingId = ref(null)
const resetsLeft = ref(3)
const isExploding = ref(false)

const isDragging = ref(false)
const draggedIdx = ref(null)
const dropTargetIdx = ref(null)
const isOverTrash = ref(false)
const mousePos = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })
const offsetPos = ref({ x: 0, y: 0 })
let lastSwapTime = 0
let longPressTimer = null

const phantomStyle = computed(() => ({
  left: `${mousePos.value.x - offsetPos.value.x}px`,
  top: `${mousePos.value.y - offsetPos.value.y - SENSOR_OFFSET}px`
}))

const triggerAnim = (refVar, id) => {
  refVar.value = null
  nextTick(() => {
    refVar.value = id
    setTimeout(() => { if (refVar.value === id) refVar.value = null }, 400)
  })
}

const resetConstructor = () => {
  if (resetsLeft.value > 0 && !isExploding.value) {
    isExploding.value = true
    navigator.vibrate?.([10, 30, 10])
    setTimeout(() => {
      emit('update:modelValue', [])
      isExploding.value = false
      resetsLeft.value--
    }, 400)
  }
}

const onPointerDown = (e, index) => {
  if (props.modelValue[index].static || isExploding.value) return
  const wordId = props.modelValue[index].id
  const rect = e.currentTarget.getBoundingClientRect()
  offsetPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  mousePos.value = { x: e.clientX, y: e.clientY }
  startPos.value = { x: e.clientX, y: e.clientY }
  draggedIdx.value = index

  longPressTimer = setTimeout(() => {
    if (!isDragging.value) { isDragging.value = true; navigator.vibrate?.(15) }
  }, LONG_PRESS_DELAY)

  const move = (me) => {
    mousePos.value = { x: me.clientX, y: me.clientY }
    const dist = Math.hypot(me.clientX - startPos.value.x, me.clientY - startPos.value.y)

    if (!isDragging.value && dist > 5) {
      clearTimeout(longPressTimer)
      isDragging.value = true
    }

    if (isDragging.value) {
      const scanY = me.clientY - SENSOR_OFFSET
      const el = document.elementFromPoint(me.clientX, scanY)
      const elAtFinger = document.elementFromPoint(me.clientX, me.clientY)

      isOverTrash.value = !!elAtFinger?.closest('#trash-bin')
      const targetWrapper = el?.closest('.word-wrapper')

      if (targetWrapper && !isOverTrash.value) {
        const tIdx = parseInt(targetWrapper.getAttribute('data-index'))

        // Предотвращаем лишние вычисления, если мы над тем же индексом
        if (tIdx === draggedIdx.value) {
          dropTargetIdx.value = null
          return
        }

        const now = Date.now()
        // Увеличили задержку между свопами для стабильности
        if (now - lastSwapTime < 150) return

        const tRect = targetWrapper.getBoundingClientRect()
        const midpoint = tRect.left + tRect.width / 2

        // Условие срабатывания: только если пересекли центр соседнего пилла
        const shouldSwap = (tIdx > draggedIdx.value && me.clientX > midpoint) ||
                           (tIdx < draggedIdx.value && me.clientX < midpoint)

        if (shouldSwap) {
          const words = [...props.modelValue]
          const [moved] = words.splice(draggedIdx.value, 1)
          words.splice(tIdx, 0, moved)

          emit('update:modelValue', words)
          draggedIdx.value = tIdx
          lastSwapTime = now
          dropTargetIdx.value = null // Очищаем индикатор при успешном свопе
        } else {
          dropTargetIdx.value = tIdx
        }
      } else {
        dropTargetIdx.value = null
      }
    }
  }

  const up = () => {
    clearTimeout(longPressTimer)
    if (isDragging.value) {
      if (isOverTrash.value) {
        const words = [...props.modelValue]
        words.splice(draggedIdx.value, 1)
        emit('update:modelValue', words)
        navigator.vibrate?.(20)
      } else { triggerAnim(lastDroppedId, wordId) }
    } else if (draggedIdx.value !== null) {
      const words = [...props.modelValue]
      const w = words[draggedIdx.value]
      if (w?.forms) {
        w.text = w.forms[(w.forms.indexOf(w.text) + 1) % w.forms.length]
        triggerAnim(pulsingId, wordId)
        emit('update:modelValue', words)
        navigator.vibrate?.(5)
      }
    }
    isDragging.value = false; isOverTrash.value = false; dropTargetIdx.value = null
    setTimeout(() => { draggedIdx.value = null }, 200)
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
</script>

<style lang="scss" scoped>
.no-select { user-select: none !important; -webkit-user-select: none !important; }

.word-constructor-container { border-top: 1px solid #eee; background: white; }
.word-wrapper { padding: 4px 2px; position: relative; display: flex; align-items: center; transition: all 0.3s ease; }

.anim-explode {
  opacity: 0; pointer-events: none;
  &:nth-child(even) { transform: translate(80px, -120px) rotate(30deg) scale(0); }
  &:nth-child(odd) { transform: translate(-80px, -120px) rotate(-30deg) scale(0); }
}

.word-pill {
  padding: 10px 16px; background: white; border-radius: 12px;
  border: 1px solid #e0e0e0; font-weight: 700; color: #333;
  touch-action: none; position: relative; z-index: 2; transition: background-color 0.2s, color 0.2s, transform 0.2s, border-color 0.2s;
  &.is-form { border-color: $primary; color: $primary; background: #f4f9ff; }
  &.ghost-word { opacity: 0.3 !important; }
  &.static-pill { background: transparent; border: none; padding: 10px 4px; font-size: 1.4em; color: #444; }
}

/* ФАНТОМ И ЕГО СОСТОЯНИЯ */
.phantom-pill {
  position: fixed; pointer-events: none; z-index: 9999;
  box-shadow: 0 12px 25px rgba(0,0,0,0.15); background: white;
  will-change: transform, background-color;
}

.pill-to-delete {
  background-color: $red-5 !important;
  color: white !important;
  border-color: $red-7 !important;
  transform: scale(0.8); /* Уменьшение при наведении на корзину */
}

.phantom-fly-enter-active { animation: pop-up 0.25s cubic-bezier(0.2, 1, 0.3, 1.2); }
.phantom-fly-leave-active { transition: all 0.2s ease-in; opacity: 0; transform: scale(0.5) translateY(30px); }

@keyframes pop-up {
  0% { transform: scale(0.9) translateY(30px); opacity: 0; }
  100% { transform: scale(1.05) translateY(0); opacity: 1; }
}

.words-move { transition: transform 0.3s cubic-bezier(0.2, 1, 0.2, 1) !important; }

.anim-shake-y { animation: spring-shake-y 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@keyframes spring-shake-y {
  0% { transform: translateY(0) scaleY(1); }
  25% { transform: translateY(-6px) scaleY(1.05) scaleX(0.92); }
  50% { transform: translateY(2px) scaleY(0.92) scaleX(1.05); }
  75% { transform: translateY(-2px) scaleY(1.03); }
  100% { transform: translateY(0) scaleY(1); }
}

.anim-rubber-modest { animation: rubber-lite 0.4s ease-out; }
@keyframes rubber-lite {
  0% { transform: scale3d(1, 1, 1); }
  30% { transform: scale3d(1.15, 0.9, 1); }
  50% { transform: scale3d(0.9, 1.15, 1); }
  100% { transform: scale3d(1, 1, 1); }
}

.action-box { height: 52px; border-radius: 14px; font-weight: 800; transition: all 0.2s ease; }
.trash-zone {
  background: #fcfcfc; border: 2px dashed #ccc; color: #999;
  &.trash-active { background: rgba($red-5, 0.1); color: $red-5; border-color: $red-5; transform: scale(1.02); }
}

.undo-badge-mini {
  position: absolute; top: -4px; right: -4px; background: $primary;
  color: white; border-radius: 50%; width: 14px; height: 14px;
  font-size: 10px; display: flex; align-items: center; justify-content: center;
}
</style>

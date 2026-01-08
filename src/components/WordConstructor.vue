<template>
  <q-card square flat class="no-select">
    <q-card-section class="flex justify-between items-center q-px-md q-py-xs">
      <div class="text-caption text-grey-6 uppercase">Сборка цепи</div>
      <q-btn
        flat dense color="grey-7" icon="refresh"
        :disable="resetsLeft <= 0 || !modelValue.length || isExploding"
        @click="resetConstructor"
      >
        <q-badge floating>{{ resetsLeft }}</q-badge>
        <q-tooltip>Сбросить</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section class="q-pa-md q-pb-none">
      <div class="words-container row justify-center items-center relative-position bg-grey-2 q-pa-sm">
        <transition-group name="words" tag="div" class="row justify-center content-start wrap-gap"  :class="containerClass">
          <div v-for="(word, index) in modelValue"
               :key="word.id"
               :data-index="index"
               class="word-wrapper"
               :class="{ 'anim-explode': isExploding }">

            <WordPill
              :data="word"
              :is-dragged="isDragging && draggedIdx === index"
              :is-merge-target="targetMergeIdx === index"
              :is-connected-left="checkConnection(index, 'left')"
              :is-connected-right="checkConnection(index, 'right')"
              :is-pulsing="pulsingId === word.id"
              :is-dropped="lastDroppedId === word.id"
              @down="onPointerDown($event, index)"
            />
          </div>
        </transition-group>

        <transition name="phantom-fly">
          <div v-if="isDragging && draggedIdx !== null"
               class="fixed z-max pointer-events-none"
               :style="phantomStyle">
            <WordPill :data="modelValue[draggedIdx]" />
          </div>
        </transition>
      </div>
    </q-card-section>

    <q-card-actions class="q-pt-sm full-width">
      <transition name="fade-fast" mode="out-in">
        <div v-if="isDragging" id="trash-bin"
             class="action-box flex flex-center full-width rounded-borders border-dashed transition-base"
             :class="isOverTrash ? 'bg-red-1 text-red border-red' : 'bg-grey-2 text-grey-6'">
          <q-icon :name="isOverTrash ? 'delete_sweep' : 'delete_outline'" size="sm" />
        </div>
        <q-btn v-else unelevated color="primary"
                class="action-box full-width text-weight-bolder"
                label="ПРОВЕРИТЬ"
                :disable="!modelValue?.length || isExploding"
                @click="$emit('submit')" />
      </transition>
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, toRef } from 'vue'
import WordPill from './WordPill.vue'
import { useWordDrag } from '../composables/useWordDrag'

const props = defineProps({ modelValue: Array })
const emit = defineEmits(['update:modelValue', 'submit'])

const resetsLeft = ref(3)
const isExploding = ref(false)
const pulsingId = ref(null)
const lastDroppedId = ref(null)

const containerClass = computed(() => {
  // Считаем общую длину всех слов + пробелы между ними
  const totalChars = props.modelValue?.reduce((acc, word) => acc + (word.text?.length || 0), 0) || 0
  const spacingOffset = (props.modelValue?.length || 0) * 2 // запас на отступы (gap)

  const weight = totalChars + spacingOffset

  if (weight <= 12) return 'h-1-row'
  if (weight <= 25) return 'h-2-rows'
  if (weight <= 50) return 'h-3-rows'
  return 'h-4-rows'
})

const checkConnection = (index, side) => {
  const neighborIdx = side === 'left' ? index - 1 : index + 1
  const current = props.modelValue[index]
  const neighbor = props.modelValue[neighborIdx]
  if (!neighbor || (isDragging.value && (draggedIdx.value === index || draggedIdx.value === neighborIdx))) {
    return false
  }
  return side === 'left'
    ? (neighbor.rightConn !== null && neighbor.rightConn === current.leftConn)
    : (current.rightConn !== null && current.rightConn === neighbor.leftConn)
}

const handleWordAction = (idx) => {
  const words = JSON.parse(JSON.stringify(props.modelValue))
  const w = words[idx]
  let changed = false
  if (w.type === 'mirror') {
    w.text = w.text === w.original ? w.opposite : w.original
    const temp = w.leftConn
    w.leftConn = w.rightConn
    w.rightConn = temp

    changed = true
  }
  else if (w.forms) {
    const curIdx = w.forms.indexOf(w.text)
    const nextIdx = (curIdx + 1) % w.forms.length
    w.text = w.forms[nextIdx]
    if (w.connCycle && w.connCycle[nextIdx]) {
      const cycleData = w.connCycle[nextIdx]
      if (Array.isArray(cycleData)) {
        w.leftConn = cycleData[0]
        w.rightConn = cycleData[1]
      } else if (typeof cycleData === 'object') {
        w.leftConn = cycleData.l
        w.rightConn = cycleData.r
      } else {
        w.rightConn = cycleData
      }
    }
    changed = true
  }
  // 3. Mystery (Раскрытие)
  else if (w.type === 'mystery' && w.hidden) {
    w.hidden = false
    changed = true
  }
  if (changed) {
    pulsingId.value = w.id
    emit('update:modelValue', words)
    navigator.vibrate?.(10)
    setTimeout(() => pulsingId.value = null, 400)
  }
}

const {
  isDragging, draggedIdx, targetMergeIdx,
  isOverTrash, phantomStyle, onPointerDown
} = useWordDrag(
  toRef(props, 'modelValue'),
  {
    onUpdate: (val) => emit('update:modelValue', val),
    onFormChange: (idx) => handleWordAction(idx),
    onDropSuccess: (id) => {
      lastDroppedId.value = id
      setTimeout(() => lastDroppedId.value = null, 400)
    }
  }
)

const resetConstructor = () => {
  isExploding.value = true
  setTimeout(() => {
    emit('update:modelValue', [])
    isExploding.value = false
    resetsLeft.value--
  }, 450)
}
</script>

<style lang="scss" scoped>
.h-1-row { height: 60px; }
.h-2-rows { height: 115px; }
.h-3-rows { height: 145px; }
.h-4-rows { height: 225px; }
.word-wrapper {
  padding: 4px 0;
}
.action-box {
  height: 52px;
  border-radius: 12px;
}
.border-dashed {
  border: 2px dashed #ccc;
  &.border-red { border-color: $red; color: $red; }
}
.no-select {
  user-select: none;
  touch-action: none;
}
</style>

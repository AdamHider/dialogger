// composables/useWordDrag.js
import { ref, computed } from 'vue'

export function useWordDrag(modelValue, { onUpdate, onFormChange, onDropSuccess }) {
  const isDragging = ref(false)
  const draggedIdx = ref(null)
  const targetMergeIdx = ref(null) // Индекс блока-цели для склейки
  const isOverTrash = ref(false)

  const mousePos = ref({ x: 0, y: 0 })
  const startPos = ref({ x: 0, y: 0 })
  const offsetPos = ref({ x: 0, y: 0 })

  const TARGET_SENSOR_OFFSET = 50
  const currentSensorOffset = ref(0)

  let lastSwapTime = 0
  let longPressTimer = null

  const phantomStyle = computed(() => ({
    left: `${mousePos.value.x - offsetPos.value.x}px`,
    top: `${mousePos.value.y - offsetPos.value.y - currentSensorOffset.value}px`,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: isDragging.value ? 'none' : 'all 0.2s ease-out'
  }))

  const move = (me) => {
    mousePos.value = { x: me.clientX, y: me.clientY }

    if (!isDragging.value) {
      const dist = Math.hypot(me.clientX - startPos.value.x, me.clientY - startPos.value.y)
      if (dist > 5) {
        clearTimeout(longPressTimer)
        isDragging.value = true
        currentSensorOffset.value = TARGET_SENSOR_OFFSET
      }
      return
    }

    const scanY = me.clientY - currentSensorOffset.value

    // Проверка корзины
    const trashEl = document.getElementById('trash-bin')
    if (trashEl) {
      const rect = trashEl.getBoundingClientRect()
      isOverTrash.value = me.clientX >= rect.left && me.clientX <= rect.right &&
                          scanY >= rect.top && scanY <= rect.bottom
    }

    if (isOverTrash.value) {
      targetMergeIdx.value = null
      return
    }

    // Поиск блока под пальцем
    const wrappers = document.querySelectorAll('.word-wrapper')
    let foundIdx = null

    for (const el of wrappers) {
      const rect = el.getBoundingClientRect()
      if (me.clientX >= rect.left && me.clientX <= rect.right &&
          scanY >= rect.top && scanY <= rect.bottom) {
        foundIdx = parseInt(el.getAttribute('data-index'))
        break
      }
    }

    // Логика взаимодействия
    if (foundIdx !== null && foundIdx !== draggedIdx.value) {
      const draggedWord = modelValue.value[draggedIdx.value]
      const targetWord = modelValue.value[foundIdx]

      // ПРОВЕРКА НА СОВМЕСТИМОСТЬ (чтобы не убегали)
      const hasRecipe = draggedWord.mergeRules?.some(r => r.with === targetWord.text) ||
                        targetWord.mergeRules?.some(r => r.with === draggedWord.text)

      if (hasRecipe) {
        // Если блоки могут склеиться, НЕ делаем своп, просто подсвечиваем цель
        targetMergeIdx.value = foundIdx
        return
      }

      // Если не мерджеры — обычный своп (раздвигаем блоки)
      targetMergeIdx.value = null
      const now = Date.now()
      if (now - lastSwapTime > 150) {
        const words = [...modelValue.value]
        const [moved] = words.splice(draggedIdx.value, 1)
        words.splice(foundIdx, 0, moved)
        onUpdate(words)
        draggedIdx.value = foundIdx
        lastSwapTime = now
      }
    } else {
      targetMergeIdx.value = null
    }
  }

  const stop = () => {
    clearTimeout(longPressTimer)

    if (isDragging.value) {
      const scanY = mousePos.value.y - currentSensorOffset.value

      if (isOverTrash.value) {
        const words = [...modelValue.value]
        words.splice(draggedIdx.value, 1)
        onUpdate(words)
        navigator.vibrate?.(20)
      } else if (targetMergeIdx.value !== null) {
        // --- ФИНАЛИЗАЦИЯ СКЛЕЙКИ ---
        const words = [...modelValue.value]
        const draggedWord = words[draggedIdx.value]
        const targetWord = words[targetMergeIdx.value]

        let rule = draggedWord.mergeRules?.find(r => r.with === targetWord.text)
        if (!rule) rule = targetWord.mergeRules?.find(r => r.with === draggedWord.text)

        if (rule) {
          const mergedBlock = {
            id: Date.now() + Math.random(),
            text: rule.result,
            type: rule.resultType || 'splitter',
            originalParts: JSON.parse(JSON.stringify([draggedWord, targetWord]))
          }

          const low = Math.min(draggedIdx.value, targetMergeIdx.value)
          const high = Math.max(draggedIdx.value, targetMergeIdx.value)

          words.splice(high, 1)
          words.splice(low, 1, mergedBlock)

          onUpdate(words)
          navigator.vibrate?.([30, 50])
        }
      } else {
        onDropSuccess?.(modelValue.value[draggedIdx.value]?.id)
      }
    } else {
      // КЛИК (Разъединение или Трансформация)
      if (draggedIdx.value !== null) {
        onFormChange?.(draggedIdx.value)
      }
    }

    // Полный сброс всех состояний
    isDragging.value = false
    isOverTrash.value = false
    targetMergeIdx.value = null
    currentSensorOffset.value = 0
    draggedIdx.value = null

    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }

  const onPointerDown = (e, index) => {
    // Не даем тащить статику
    if (modelValue.value[index].static) return

    const rect = e.currentTarget.getBoundingClientRect()
    offsetPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    mousePos.value = { x: e.clientX, y: e.clientY }
    startPos.value = { x: e.clientX, y: e.clientY }
    draggedIdx.value = index
    currentSensorOffset.value = 0

    longPressTimer = setTimeout(() => {
      if (!isDragging.value) {
        isDragging.value = true
        currentSensorOffset.value = TARGET_SENSOR_OFFSET
        navigator.vibrate?.(15)
      }
    }, 150)

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return {
    isDragging,
    draggedIdx,
    targetMergeIdx,
    isOverTrash,
    phantomStyle,
    onPointerDown
  }
}

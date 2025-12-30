// composables/useWordDrag.js
import { ref, computed, onUnmounted } from 'vue'

export function useWordDrag(modelValue, { onUpdate, onFormChange, onDropSuccess }) {
  const isDragging = ref(false)
  const draggedIdx = ref(null)
  const isOverTrash = ref(false)
  
  const mousePos = ref({ x: 0, y: 0 })
  const startPos = ref({ x: 0, y: 0 })
  const offsetPos = ref({ x: 0, y: 0 })
  
  // Плавное смещение сенсора
  const TARGET_SENSOR_OFFSET = 50 
  const currentSensorOffset = ref(0)
  
  let lastSwapTime = 0
  let longPressTimer = null

  const phantomStyle = computed(() => ({
    left: `${mousePos.value.x - offsetPos.value.x}px`,
    // Фантом плавно поднимается при активации драга
    top: `${mousePos.value.y - offsetPos.value.y - currentSensorOffset.value}px`,
    pointerEvents: 'none',
    transition: isDragging.value ? 'none' : 'top 0.2s ease-out, transform 0.2s ease-out'
  }))

  const move = (me) => {
    mousePos.value = { x: me.clientX, y: me.clientY }
    
    if (!isDragging.value) {
      const dist = Math.hypot(me.clientX - startPos.value.x, me.clientY - startPos.value.y)
      if (dist > 5) {
        clearTimeout(longPressTimer)
        isDragging.value = true
        currentSensorOffset.value = TARGET_SENSOR_OFFSET // Подлёт вверх
      }
      return
    }

    // ВАЖНО: Единая точка сканирования для слов и корзины
    const scanY = me.clientY - currentSensorOffset.value

    // Проверка корзины с учетом смещенного сенсора
    const trashEl = document.getElementById('trash-bin')
    if (trashEl) {
      const rect = trashEl.getBoundingClientRect()
      isOverTrash.value = me.clientX >= rect.left && me.clientX <= rect.right &&
                          scanY >= rect.top && scanY <= rect.bottom
    }

    if (isOverTrash.value) return

    // Геометрический поиск цели
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

    if (foundIdx !== null && foundIdx !== draggedIdx.value) {
      const now = Date.now()
      if (now - lastSwapTime > 150) {
        const words = [...modelValue.value]
        const [moved] = words.splice(draggedIdx.value, 1)
        words.splice(foundIdx, 0, moved)
        onUpdate(words)
        draggedIdx.value = foundIdx
        lastSwapTime = now
      }
    }
  }

  const stop = () => {
    clearTimeout(longPressTimer)
    if (isDragging.value) {
      if (isOverTrash.value) {
        const words = [...modelValue.value]
        words.splice(draggedIdx.value, 1)
        onUpdate(words)
        navigator.vibrate?.(20)
      } else {
        onDropSuccess?.(modelValue.value[draggedIdx.value]?.id)
      }
    } else if (draggedIdx.value !== null) {
      onFormChange?.(draggedIdx.value)
    }

    isDragging.value = false
    isOverTrash.value = false
    currentSensorOffset.value = 0 // Возврат на место
    setTimeout(() => { draggedIdx.value = null }, 200)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }

  const onPointerDown = (e, index) => {
    if (modelValue.value[index].static) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    offsetPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    mousePos.value = { x: e.clientX, y: e.clientY }
    startPos.value = { x: e.clientX, y: e.clientY }
    draggedIdx.value = index
    currentSensorOffset.value = 0 // Сначала под пальцем

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

  return { isDragging, draggedIdx, isOverTrash, phantomStyle, onPointerDown }
}
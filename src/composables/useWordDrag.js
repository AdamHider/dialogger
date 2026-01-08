import { ref, computed } from 'vue'

export function useWordDrag(modelValue, { onUpdate, onFormChange, onDropSuccess }) {
  const isDragging = ref(false)
  const draggedIdx = ref(null)
  const isOverTrash = ref(false)
  const currentSensorOffset = ref(0)
  const targetMergeIdx = ref(null)

  const pos = ref({
    current: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  })

  let lastSwapTime = 0
  let longPressTimer = null
  let compatibilityTimer = null

  const phantomStyle = computed(() => ({
    left: `${pos.value.current.x - pos.value.offset.x}px`,
    top: `${pos.value.current.y - pos.value.offset.y - currentSensorOffset.value}px`,
    pointerEvents: 'none',
    transition: isDragging.value ? 'none' : 'all 0.2s ease-out',
    zIndex: 9999
  }))

  const updateWords = (newWords) => onUpdate([...newWords])

  const checkTrash = (x, y) => {
    const el = document.getElementById('trash-bin')
    isOverTrash.value = el ? isInside(x, y, el.getBoundingClientRect()) : false
  }

  const getWordIndexAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest('.word-wrapper')
    return el ? parseInt(el.getAttribute('data-index')) : null
  }

  const checkCompatibility = (dragged, target, isAfter) => {
    if (!dragged || !target) return false
    return isAfter
      ? (dragged.leftConn !== null && dragged.leftConn === target.rightConn)
      : (dragged.rightConn !== null && dragged.rightConn === target.leftConn)
  }

  const move = (e) => {
    pos.value.current = { x: e.clientX, y: e.clientY }
    if (!isDragging.value) {
      const dist = Math.hypot(e.clientX - pos.value.start.x, e.clientY - pos.value.start.y)
      if (dist > 5) activateDrag()
      return
    }
    const scanY = e.clientY - currentSensorOffset.value
    checkTrash(e.clientX, scanY)
    if (!isOverTrash.value) handleInteraction(e.clientX, scanY)
  }

  const handleInteraction = (x, y) => {
    const foundIdx = getWordIndexAt(x, y)
    const now = Date.now()

    if (foundIdx !== null && foundIdx !== draggedIdx.value) {
      if (now - lastSwapTime > 250) {
        targetMergeIdx.value = null
        clearTimeout(compatibilityTimer)

        const words = [...modelValue.value]
        const [moved] = words.splice(draggedIdx.value, 1)
        words.splice(foundIdx, 0, moved)

        updateWords(words)
        draggedIdx.value = foundIdx
        lastSwapTime = now

        compatibilityTimer = setTimeout(() => {
          const isAfter = draggedIdx.value > foundIdx
          const isComp = checkCompatibility(modelValue.value[draggedIdx.value], modelValue.value[foundIdx], isAfter)
          if (isComp) targetMergeIdx.value = foundIdx
        }, 400)
      }
    } else if (foundIdx === null) {
      targetMergeIdx.value = null
      clearTimeout(compatibilityTimer)
    }
  }

  const activateDrag = () => {
    clearTimeout(longPressTimer)
    isDragging.value = true
    currentSensorOffset.value = 35
  }

  const stop = () => {
    clearTimeout(longPressTimer)
    clearTimeout(compatibilityTimer)
    if (isDragging.value) {
      if (isOverTrash.value) {
        const words = [...modelValue.value]
        words.splice(draggedIdx.value, 1)
        updateWords(words)
        navigator.vibrate?.(20)
      } else {
        onDropSuccess?.(modelValue.value[draggedIdx.value]?.id)
      }
    } else if (draggedIdx.value !== null) {
      onFormChange?.(draggedIdx.value)
    }
    cleanup()
  }

  const cleanup = () => {
    isDragging.value = false
    isOverTrash.value = false
    targetMergeIdx.value = null
    currentSensorOffset.value = 0
    setTimeout(() => { draggedIdx.value = null }, 200)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }

  const onPointerDown = (e, index) => {
    if (modelValue.value[index].static) return
    const rect = e.currentTarget.getBoundingClientRect()
    pos.value.start = { x: e.clientX, y: e.clientY }
    pos.value.current = { x: e.clientX, y: e.clientY }
    pos.value.offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    draggedIdx.value = index
    longPressTimer = setTimeout(activateDrag, 150)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const isInside = (x, y, rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

  return { isDragging, draggedIdx, isOverTrash, targetMergeIdx, phantomStyle, onPointerDown }
}


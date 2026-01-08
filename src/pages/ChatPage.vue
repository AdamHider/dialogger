<template>
  <q-page class="column no-wrap bg-grey-2 overflow-hidden" :style="{ height: 'calc(100dvh - 48px)' }">
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <template v-if="!loading">
      <div class="row items-center q-px-md q-py-sm bg-white shadow-1 z-top">
        <q-btn flat round dense icon="arrow_back" color="grey-7" />
        <q-avatar size="38px" class="q-ml-sm">
          <img src="https://cdn.quasar.dev/img/avatar4.jpg">
        </q-avatar>
        <div class="q-ml-md col">
          <div class="text-weight-bold">Alex Teacher</div>
          <div class="text-caption text-positive" style="line-height: 1">
            Диалог загружен
          </div>
        </div>
      </div>

      <div class="col relative-position">
        <ChatHistory
          :messages="history"
          :current-phrase="currentPhrase"
          :is-typing="isTyping"
        />
      </div>

      <WordConstructor
        v-if="sessionWords.length > 0"
        :modelValue="sessionWords"
        @update:modelValue="handleWordsUpdate"
        @submit="handleUserSubmit"
      />
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../scripts/api' // Импортируем наш клиент
import ChatHistory from '../components/ChatHistory.vue'
import WordConstructor from '../components/WordConstructor.vue'
import { REACTIONS } from '../scripts/scenario.js' // Оставляем только реакции

const scenario = ref([]) // Теперь это пустой массив, который придет с сервера
const history = ref([])
const isTyping = ref(false)
const sessionWords = ref([])
const currentStep = ref(0)
const errorCount = ref(0)
const loading = ref(true) // Состояние загрузки

const DELAY_NPC_THINK = 1000
const DELAY_NPC_NEXT_STEP = 800

// Загрузка данных с сервера
const fetchDialog = async () => {
  try {
    loading.value = true
    // Предположим, мы грузим диалог с ID 1 (или берем из параметров роута)
    const response = await api.get('dialog/1')

    // Наш сервер возвращает структуру, которую DialogService.process() превратил в массив реплик
    // Фильтруем только те реплики, которые участвуют в обучении
    scenario.value = response.data.data

    startLesson()
  } catch (err) {
    console.error("Ошибка загрузки диалога:", err)
  } finally {
    loading.value = false
  }
}
const handleWordsUpdate = (newWords) => {
  // Если массив пустой (например, нажали "сброс"),
  // перезагружаем текущий шаг, чтобы перемешать слова заново
  if (newWords.length === 0 && sessionWords.value.length > 0) {
    setTimeout(() => loadStep(currentStep.value), 100)
  } else {
    sessionWords.value = newWords
  }
}
const startLesson = () => {
  if (scenario.value.length > 0) {
    // Находим первую реплику бота
    const firstBotMsg = scenario.value.find(m => m.role === 'bot')
    if (firstBotMsg) addMessage('npc', firstBotMsg.text)

    // Находим первый шаг (где есть токены)
    const firstTaskIdx = scenario.value.findIndex(m => m.tokens)
    if (firstTaskIdx !== -1) {
      currentStep.value = firstTaskIdx
      loadStep(firstTaskIdx)
    }
  }
}

const currentPhrase = computed(() => {
  return sessionWords.value
    .map(w => w.text)
    .join(' ')
    .replace(/\s([,.!?;:—])/g, '$1') // Улучшенная очистка пробелов
})

const loadStep = (index) => {
  const step = scenario.value[index]
  if (!step || !step.tokens) return

  // Используем токены, которые сервер уже "обогатил" (id, connections)
  const tokensCopy = JSON.parse(JSON.stringify(step.tokens))

  const nonStatic = tokensCopy
    .filter(t => !t.static)
    .sort(() => Math.random() - 0.5)

  let nsIdx = 0
  sessionWords.value = tokensCopy.map(t => t.static ? t : nonStatic[nsIdx++])
}

const handleUserSubmit = async () => {
  const step = scenario.value[currentStep.value]
  const phrase = currentPhrase.value

  // Ожидаемый текст мы теперь берем из поля 'text', которое подготовил stripMarkup в сервисе
  const isCorrect = phrase.toLowerCase() === step.text.toLowerCase()

  addMessage('user', phrase)
  const backupWords = [...sessionWords.value]
  sessionWords.value = []

  isTyping.value = true
  await new Promise(r => setTimeout(r, DELAY_NPC_THINK))
  isTyping.value = false

  if (isCorrect) {
    await handleSuccess()
  } else {
    handleFailure(step, backupWords)
  }
}

const handleSuccess = async () => {
  const reaction = REACTIONS.positive[Math.floor(Math.random() * REACTIONS.positive.length)]
  addMessage('npc', reaction)

  // Ищем следующий шаг, где есть токены (пропуская промежуточные реплики бота)
  let nextIdx = currentStep.value + 1
  errorCount.value = 0

  await new Promise(r => setTimeout(r, DELAY_NPC_NEXT_STEP))

  // Идем по сценарию дальше
  while (nextIdx < scenario.value.length) {
    const nextItem = scenario.value[nextIdx]

    if (nextItem.role === 'bot') {
       addMessage('npc', nextItem.text)
    }

    if (nextItem.tokens) {
      currentStep.value = nextIdx
      loadStep(nextIdx)
      return // Останавливаемся на следующем задании
    }
    nextIdx++
  }

  addMessage('npc', "Урок окончен! Ты отлично справился. 🏆")
}

const addMessage = (sender, text) => {
  history.value.push({ id: Date.now(), sender, text })
}

const handleFailure = (step, backup) => {
  errorCount.value++
  let botText = REACTIONS.negative[Math.floor(Math.random() * REACTIONS.negative.length)]

  // В нашей новой системе в маркапе пока нет поля hint,
  // но его можно добавить в DialogService при желании
  addMessage('npc', botText)
  sessionWords.value = backup
}

onMounted(fetchDialog)
</script>
<style lang="scss" scoped>
.z-top {
  z-index: 10;
}
</style>

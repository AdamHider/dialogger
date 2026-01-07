<template>
  <q-page class="column no-wrap bg-grey-2 overflow-hidden" :style="{ height: 'calc(100dvh - 48px)' }">
    
    <div class="row items-center q-px-md q-py-sm bg-white shadow-1 z-top">
      <q-btn flat round dense icon="arrow_back" color="grey-7" />
      <q-avatar size="38px" class="q-ml-sm">
        <img src="https://cdn.quasar.dev/img/avatar4.jpg">
      </q-avatar>
      <div class="q-ml-md col">
        <div class="text-weight-bold">Alex Teacher</div>
        <div class="text-caption text-positive" style="line-height: 1">
          Шаг {{ currentStep + 1 }} из {{ scenario.length }}
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
      :modelValue="sessionWords"
      @update:modelValue="handleWordsUpdate"
      @submit="handleUserSubmit"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ChatHistory from '../components/ChatHistory.vue'
import WordConstructor from '../components/WordConstructor.vue'

import { scenario, REACTIONS } from '../scripts/scenario.js'

const history = ref([])
const isTyping = ref(false)
const sessionWords = ref([])
const currentStep = ref(0)
const errorCount = ref(0)

const DELAY_NPC_THINK = 1000
const DELAY_NPC_NEXT_STEP = 800

const currentPhrase = computed(() => {
  return sessionWords.value
    .map(w => w.text)
    .join(' ')
    .replace(/\s([,.!?])/g, '$1') // Убираем пробел перед пунктуацией
})

const addMessage = (sender, text) => {
  history.value.push({
    id: Date.now(),
    sender,
    text
  })
}

const loadStep = (index) => {
  const step = scenario[index]
  if (!step) return

  const tokensCopy = JSON.parse(JSON.stringify(step.tokens))
  
  const nonStatic = tokensCopy
    .filter(t => !t.static)
    .sort(() => Math.random() - 0.5)
  
  let nsIdx = 0
  sessionWords.value = tokensCopy.map(t => t.static ? t : nonStatic[nsIdx++])
}

const handleWordsUpdate = (newWords) => {
  if (newWords.length === 0 && sessionWords.value.length > 0) {
    setTimeout(() => loadStep(currentStep.value), 100)
  } else {
    sessionWords.value = newWords
  }
}

// Главная логика проверки ответа
const handleUserSubmit = async () => {
  const step = scenario[currentStep.value]
  const phrase = currentPhrase.value
  const isCorrect = phrase.toLowerCase() === step.expected.toLowerCase()

  // 1. Добавляем ответ пользователя в чат и очищаем конструктор
  addMessage('user', phrase)
  const backupWords = [...sessionWords.value]
  sessionWords.value = []

  // 2. Имитируем "раздумья" бота
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

  currentStep.value++
  errorCount.value = 0

  await new Promise(r => setTimeout(r, DELAY_NPC_NEXT_STEP))

  if (scenario[currentStep.value]) {
    addMessage('npc', scenario[currentStep.value].botSay)
    loadStep(currentStep.value)
  } else {
    addMessage('npc', "Урок окончен! Ты отлично справился с цепями. 🏆")
  }
}

const handleFailure = (step, backup) => {
  errorCount.value++
  let botText = REACTIONS.negative[Math.floor(Math.random() * REACTIONS.negative.length)]

  // Если ошибок много, даем подсказку из сценария
  if (errorCount.value >= 2 && step.hint) {
    botText = `Подсказка: ${step.hint}`
  }

  addMessage('npc', botText)
  sessionWords.value = backup // Возвращаем слова в конструктор для исправления
}

// Старт урока
onMounted(() => {
  if (scenario.length > 0) {
    addMessage('npc', scenario[0].botSay)
    loadStep(0)
  }
})
</script>

<style lang="scss" scoped>
.z-top {
  z-index: 10;
}
</style>
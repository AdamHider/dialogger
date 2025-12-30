<template>
  <q-page class="column no-wrap bg-grey-2 overflow-hidden" :style="{ height: 'calc(100dvh - 48px)' }">

    <div class="row items-center q-px-md q-py-sm bg-white shadow-1 z-top">
      <q-btn flat round dense icon="arrow_back" color="grey-7" />
      <q-avatar size="38px" class="q-ml-sm">
        <img src="https://cdn.quasar.dev/img/avatar4.jpg">
      </q-avatar>
      <div class="q-ml-md">
        <div class="text-weight-bold">Alex Teacher</div>
        <div class="text-caption text-positive" style="line-height: 1">online</div>
      </div>
    </div>

    <div class="col relative-position">
      <q-scroll-area
        ref="chatScroll"
        class="absolute-full"
        :content-style="{ minHeight: '100%', display: 'flex', flexDirection: 'column' }"
      >
        <div class="col-grow"></div>

        <div class="q-pa-md">
          <div
            v-for="msg in history" :key="msg.id"
            :class="msg.sender === 'npc' ? 'row q-py-xs' : 'row justify-end q-py-xs'"
            class="animate-fade"
          >
            <div :class="msg.sender === 'npc' ? 'chat-bubble-npc' : 'chat-bubble-user'" class="shadow-1">
              {{ msg.text }}
            </div>
          </div>

          <transition name="phantom-fade">
            <div v-if="currentPhrase && !isTyping" class="row justify-end q-py-md">
              <div class="phantom-bubble">
                <transition name="text-change" mode="out-in">
                  <span :key="currentPhrase">{{ currentPhrase }}</span>
                </transition>
                <span class="cursor-blink">|</span>
              </div>
            </div>
          </transition>

          <div v-if="isTyping" class="row q-py-xs animate-fade">
            <div class="chat-bubble-npc typing-dots">
              <q-spinner-dots size="20px" color="primary" />
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>

    <WordConstructor
      :modelValue="sessionWords"
      @update:modelValue="handleWordsUpdate"
      @submit="handleUserSubmit"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import WordConstructor from '../components/WordConstructor.vue'

// --- СОСТОЯНИЕ ---
const history = ref([])
const isTyping = ref(false)
const chatScroll = ref(null)
const sessionWords = ref([])
const currentStep = ref(0)
const errorCount = ref(0)

// --- КОНТЕНТ ---
const positiveReactions = ["Именно так! 👍", "Perfect! У тебя отлично получается.", "В точку! Двигаемся дальше?", "Абсолютно верно. Keep it up!"]
const negativeReactions = ["Почти, но не совсем. Попробуй еще раз!", "Хмм, что-то не сходится. Посмотри на порядок слов.", "Не совсем так. Давай дадим этому еще один шанс."]

const scenario = [
  {
    botSay: "Привет! Давай начнем с эмоций. Собери: 'I love pizza.'",
    expected: "I love pizza.",
    hint: "Если видишь фиолетовый пилл, кликни по нему, чтобы сменить 'hate' на 'love'.",
    tokens: [
      { id: 1, text: 'I', type: 'standard' },
      // Mirror: обучаем менять негатив на позитив
      { id: 2, text: 'hate', original: 'love', opposite: 'hate', type: 'mirror' }, 
      { id: 3, text: 'pizza', type: 'standard' },
      { id: 4, text: '.', static: true }
    ]
  },
  {
    botSay: "Хорошо! А теперь давай уточним количество. Собери: 'I have three pizzas.'",
    expected: "I have three pizzas.",
    hint: "Не забудь изменить форму слова 'pizza' на множественное число.",
    tokens: [
      { id: 5, text: 'I', type: 'standard' },
      { id: 6, text: 'have', type: 'standard' },
      { id: 7, text: 'three', type: 'standard' },
      // Form: тренируем окончание -s
      { id: 8, text: 'pizza', forms: ['pizza', 'pizzas'], type: 'form' }, 
      { id: 9, text: '.', static: true }
    ]
  },
  {
    botSay: "Теперь добавим отрицание. Собери: 'I do not like cold days.'",
    expected: "I do not like cold days.",
    hint: "Используй зеркальный пилл для отрицания и подбери нужную форму погоды.",
    tokens: [
      { id: 10, text: 'I', type: 'standard' },
      // Mirror: меняем утверждение на отрицание
      { id: 11, text: 'like', original: 'like', opposite: 'do not like', type: 'mirror' },
      // Form: выбираем холодную погоду
      { id: 12, text: 'warm', forms: ['warm', 'hot', 'cold'], type: 'form' },
      { id: 13, text: 'days', type: 'standard' },
      { id: 14, text: '.', static: true }
    ]
  },
  {
    botSay: "И напоследок — вопрос и правильный глагол. Собери: 'Is this app cool?'",
    expected: "Is this app cool?",
    hint: "Поставь 'Is' в начало предложения и выбери позитивное прилагательное.",
    tokens: [
      // Form: тренируем выбор правильной формы To Be
      { id: 15, text: 'am', forms: ['am', 'is', 'are'], type: 'form' },
      { id: 16, text: 'this', type: 'standard' },
      { id: 17, text: 'app', type: 'standard' },
      { id: 18, text: 'bad', forms: ['bad', 'cool', 'amazing'], type: 'form' },
      { id: 19, text: '?', static: true }
    ]
  }
]

// --- ЛОГИКА ---
const currentPhrase = computed(() => {
  return sessionWords.value
    .map(w => w.text)
    .join(' ')
    .replace(/\s([,.!?])/g, '$1')
})

const scrollToBottom = () => {
  nextTick(() => {
    setTimeout(() => {
      if (chatScroll.value) {
        const target = chatScroll.value.getScrollTarget()
        chatScroll.value.setScrollPosition('vertical', target.scrollHeight, 300)
      }
    }, 50)
  })
}

const loadStep = (step) => {
  // Глубокое копирование, чтобы не менять объект scenario
  const tokensCopy = JSON.parse(JSON.stringify(step.tokens))
  const nonStatic = tokensCopy.filter(t => !t.static).sort(() => Math.random() - 0.5)
  let nsIdx = 0

  sessionWords.value = tokensCopy.map(t => t.static ? t : nonStatic[nsIdx++])
}

const handleWordsUpdate = (newWords) => {
  // Если пришел пустой массив — это триггер Reset из конструктора
  if (newWords.length === 0 && sessionWords.value.length > 0) {
    setTimeout(() => {
      const step = scenario[currentStep.value]
      if (step) loadStep(step)
    }, 100)
  } else {
    sessionWords.value = newWords
  }
}

const handleUserSubmit = async () => {
  const phrase = currentPhrase.value
  const step = scenario[currentStep.value]
  const backup = JSON.parse(JSON.stringify(sessionWords.value))

  history.value.push({ id: Date.now(), sender: 'user', text: phrase })
  sessionWords.value = []
  scrollToBottom()

  isTyping.value = true
  await new Promise(r => setTimeout(r, 1000))
  isTyping.value = false

  if (phrase.toLowerCase() === step.expected.toLowerCase()) {
    const reaction = positiveReactions[Math.floor(Math.random() * positiveReactions.length)]
    history.value.push({ id: Date.now(), sender: 'npc', text: reaction })

    currentStep.value++
    errorCount.value = 0

    if (scenario[currentStep.value]) {
      await new Promise(r => setTimeout(r, 800))
      history.value.push({ id: Date.now(), sender: 'npc', text: scenario[currentStep.value].botSay })
      loadStep(scenario[currentStep.value])
    } else {
      history.value.push({ id: Date.now(), sender: 'npc', text: "Урок окончен! Ты супер. 🏆" })
    }
  } else {
    errorCount.value++
    let botText = negativeReactions[Math.floor(Math.random() * negativeReactions.length)]

    if (errorCount.value >= 2 && step.hint) {
      botText = `Подсказка: ${step.hint}`
    }

    history.value.push({ id: Date.now(), sender: 'npc', text: botText })
    sessionWords.value = backup // Возвращаем слова пользователю
  }

  scrollToBottom()
}

onMounted(() => {
  const first = scenario[0]
  history.value.push({ id: Date.now(), sender: 'npc', text: first.botSay })
  loadStep(first)
})
</script>

<style lang="scss" scoped>
.chat-bubble-npc {
  background: white; border-radius: 18px 18px 18px 4px;
  padding: 12px 16px; max-width: 85%; line-height: 1.4; color: #333;
}
.chat-bubble-user {
  background: #1976d2; color: white; border-radius: 18px 18px 4px 18px;
  padding: 12px 16px; max-width: 85%; line-height: 1.4;
}

.phantom-bubble {
  background: transparent; border: 1.5px dashed rgba(25, 118, 210, 0.3);
  color: #1976d2; opacity: 0.7; border-radius: 18px 18px 4px 18px;
  padding: 10px 16px; max-width: 85%; font-weight: 500; display: flex; align-items: center;
}

.cursor-blink {
  animation: blink 1s infinite; margin-left: 4px;
  border-left: 2px solid #1976d2; height: 1.2em;
}

@keyframes blink { 50% { opacity: 0; } }

.animate-fade { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.text-change-enter-active, .text-change-leave-active { transition: opacity 0.2s; }
.text-change-enter-from, .text-change-leave-to { opacity: 0; }
</style>

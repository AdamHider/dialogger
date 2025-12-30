<template>
  <q-page class="column shadow-2">
    <div class="col scroll q-pa-md" id="chat-messages">
      <div v-for="msg in messages" :key="msg.id"
           :class="['row q-mb-md', msg.role === 'user' ? 'justify-end' : 'justify-start']">
        <div :class="['message-bubble q-pa-sm shadow-1', msg.role === 'user' ? 'bg-primary text-white' : 'bg-white']">
          {{ msg.text }}
        </div>
      </div>
    </div>

    <div v-if="currentLevelWords.length > 0">
      <WordConstructor
        v-model="currentLevelWords"
        @submit="handleAnswer"
        @explode="onExplodeEffect"
      />
    </div>

    <audio ref="explodeSfx" src="/sounds/explode.mp3" preload="auto"></audio>
  </q-page>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import WordConstructor from '../components/WordConstructor.vue'

const messages = ref([
  {
    id: 1,
    role: 'ai',
    text: 'Блок "not" очень липкий! Попробуй соединить его с вспомогательным глаголом, чтобы получить сокращенную форму. А затем выбери правильную форму основного глагола.'
  },
  {
    id: 2,
    role: 'level_data',
    words: [
      {
        id: 10,
        text: 'She',
        type: 'static'
      },
      {
        id: 11,
        text: 'does',
        type: 'merger',
        mergeRules: [
          {
            with: 'not',
            result: "doesn't",
            resultType: 'splitter'
          }
        ]
      },
      {
        id: 12,
        text: 'not',
        type: 'merger',
        mergeRules: [
          {
            with: 'do',
            result: "don't",
            resultType: 'splitter'
          }
        ]
      },
      {
        id: 13,
        text: 'works',
        type: 'transformer',
        forms: ['work', 'works', 'worked']
      },
      {
        id: 14,
        text: 'there',
        type: 'static'
      }
    ]
  }
])
// Пример инициализации уровня с новыми механиками
const currentLevelWords = ref([
 {
      id: 20,
      text: "won't",
      type: 'splitter',
      // Сохраняем части, чтобы при разрыве получить will и not
      originalParts: [
        { id: 21, text: 'will', type: 'merger', mergeRules: [{ with: 'not', result: "won't", resultType: 'splitter' }] },
        { id: 22, text: 'not', type: 'merger', mergeRules: [{ with: 'will', result: "won't", resultType: 'splitter' }] }
      ]
    },
    { id: 23, text: 'you', type: 'static' },
    {
      id: 24,
      text: 'do',
      type: 'merger',
      mergeRules: [{ with: 'not', result: "don't", resultType: 'splitter' }]
    },
    {
      id: 25,
      text: 'not',
      type: 'merger',
      mergeRules: [{ with: 'do', result: "don't", resultType: 'splitter' }]
    },
    {
      id: 26,
      text: 'reading',
      type: 'transformer',
      forms: ['read', 'reads', 'reading', 'readed']
    },
    { id: 27, text: 'this', type: 'static' },
    { id: 28, text: '?', type: 'static' }
])

const explodeSfx = ref(null)

// Обработка взрыва бомбы из конструктора
const onExplodeEffect = () => {
  // 1. Звук
  explodeSfx.value?.play()

  // 2. Вибрация (для мобилок)
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 300])
  }

  // 3. Логика чата: бот может прокомментировать фиаско
  setTimeout(() => {
    messages.value.push({
      id: Date.now(),
      role: 'ai',
      text: 'БА-БАХ! 💥 Слишком много лишних движений. Попробуй собрать фразу экономнее.'
    })
    scrollToBottom()
  }, 600)
}

const handleAnswer = () => {
  const answer = currentLevelWords.value.map(w => w.text).join(' ')
  messages.value.push({ id: Date.now(), role: 'user', text: answer })

  // Здесь будет твоя логика проверки ответа
  currentLevelWords.value = [] // Очищаем после отправки
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    const el = document.getElementById('chat-messages')
    if (el) el.scrollTop = el.scrollHeight
  })
}
</script>

<style scoped>
.message-bubble {
  max-width: 80%;
  border-radius: 15px;
  line-height: 1.4;
}
#chat-messages {
  background: #f0f2f5;
  height: calc(100vh - 300px); /* Высота подстраивается под конструктор */
}
</style>

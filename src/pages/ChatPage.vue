<template>
  <q-page class="column no-wrap overflow-hidden" style="height: calc(100dvh - 48px); background: #574bd6;">

    <q-header class="bg-transparent text-white shadow-0">
      <q-toolbar class="q-py-sm">
        <q-avatar size="40px" class="shadow-1">
          <img src="https://cdn.quasar.dev/img/avatar4.jpg">
        </q-avatar>
        <q-toolbar-title class="column text-left">
          <span class="text-weight-bold" style="font-size: 16px;">Оджа</span>
          <div class="row items-center">
            <q-badge rounded color="green" size="8px" class="q-mr-xs" />
            <span class="text-caption opacity-70">в сети</span>
          </div>
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <div class="col column no-wrap scroll q-pa-md hide-scrollbar" ref="scrollRef">
      <div class="col-grow"></div>

      <transition-group name="msg-list">
        <MessageItem
          v-for="(msg, index) in history"
          :key="'msg-' + index"
          :text="msg.text"
          :sent="msg.role === 'user'"
          :time="msg.time"
        />

        <template v-if="currentOptions.length > 0 && !isTyping">
          <MessageItem
            v-for="opt in currentOptions"
            :key="opt.label"
            :sent="true"
            :is-option="true"
            :is-option-active="activeOptionLabel === opt.label && userInput.length > 0"
            :class="{ 'opacity-20': activeOptionLabel && activeOptionLabel !== opt.label }"
          >
            <div class="text-right">
              <template v-if="activeOptionLabel === opt.label && userInput.length > 0">
                <span
                  v-for="(char, idx) in opt.label"
                  :key="idx"
                  :class="getCharClass(opt.label, idx)"
                >{{ char }}</span>
              </template>
              <template v-else>{{ opt.label }}</template>
            </div>
          </MessageItem>
        </template>

        <div v-if="isTyping" key="typing" class="row q-mb-md justify-start">
          <div class="typing-bubble received shadow-2">
            <q-spinner-dots size="24px" color="white" />
          </div>
        </div>
      </transition-group>

      <div ref="bottomAnchor" style="height: 10px;"></div>
    </div>

    <div v-if="!isFinished" class="q-pa-lg bg-transparent relative-position">
      <transition name="slide-up">
        <div v-if="userInput && !activeOptionLabel" class="absolute-top text-center" style="top: 0px; width: 100%;">
          <div class="text-red-3 text-caption shake-error text-weight-bold">Такого варианта нет</div>
        </div>
      </transition>

      <q-input
        ref="inputRef"
        v-model="userInput"
        borderless
        dense
        autofocus
        class="custom-clean-input"
        placeholder="Напишите ответ..."
        :disable="isTyping"
        @keyup.enter="trySubmit"
      >
        <template v-slot:append>
          <div class="flex flex-center q-mr-sm relative-position" style="width: 32px; height: 32px;">
            <q-circular-progress
              :value="sendProgress"
              size="32px"
              :thickness="0.2"
              color="indigo-7"
              track-color="indigo-1"
              class="absolute-center"
            />
            <q-btn
              round
              unelevated
              dense
              :color="canSend ? 'indigo-7' : 'transparent'"
              icon="send"
              size="10px"
              @click="trySubmit"
              class="send-btn-final"
              :class="canSend ? 'text-white shadow-3' : 'text-grey-4'"
            />
          </div>
        </template>
      </q-input>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import MessageItem from 'components/MessageItem.vue' // Проверьте путь к компоненту

const history = ref([])
const userInput = ref('')
const isTyping = ref(false)
const currentNodeKey = ref('start')
const bottomAnchor = ref(null)
const dialogueTree = {
  start: {
    text: ["Селям алейкум!"," Бугунь тек <b>чай</b> бар, къаве битти. Не истейсиз?"],
    options: [
      { label: "Мераба! Чай беринъиз", next: "tea_choice" },
      { label: "Къаве ичмеге истейим", isWrong: true, reply: ["Къаве битти! Тек чай бар."] },
      { label: "Шимдилик бир шей истемам", next: "end" }
    ]
  },
  tea_choice: {
    text: ["Яхшы. Чай <b>шекерли</b> олсунмы?"],
    options: [
      { label: "Эбет, шекерли олсун", next: "finish" },
      { label: "Ёкъ, шекерсиз лютфен", next: "finish" }
    ]
  },
  finish: { text: ["Буюрунъыз! <b>Аш олсун!</b>", "Хайырлы кунлер!"], options: [] },
}

// Вычисляемые свойства
const currentOptions = computed(() => dialogueTree[currentNodeKey.value]?.options || [])
const isFinished = computed(() => currentOptions.value.length === 0 && !isTyping.value)

const activeOptionLabel = computed(() => {
  if (!userInput.value) return null
  const input = userInput.value.toLowerCase().trim()
  return currentOptions.value.find(opt => opt.label.toLowerCase().startsWith(input[0]))?.label || null
})

const sendProgress = computed(() => {
  if (!activeOptionLabel.value) return 0
  return Math.min((userInput.value.length / activeOptionLabel.value.length) * 100, 100)
})

// Кнопка активна при минимальной длине 3 символа
const canSend = computed(() => {
  if (!activeOptionLabel.value) return false
  return userInput.value.trim().toLowerCase() >= activeOptionLabel.value.toLowerCase()
})

// Логика подсветки букв в подсказке
const getCharClass = (label, idx) => {
  if (idx >= userInput.value.length) return 'opacity-40'
  return userInput.value[idx]?.toLowerCase() === label[idx]?.toLowerCase()
    ? 'text-weight-bold' : 'text-red-7'
}

const scrollToBottom = () => {
  nextTick(() => {
    setTimeout(() => {
      bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  })
}

const trySubmit = () => {
  if (canSend.value) handleSend()
}

const handleSend = async () => {
  const sentText = userInput.value.trim()
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Добавляем сообщение пользователя
  history.value.push({ role: 'user', text: sentText, time })
  userInput.value = ''
  scrollToBottom()

  // Поиск подходящего ответа (даже с опечатками)
  const match = currentOptions.value.find(o =>
    sentText.toLowerCase().includes(o.label.toLowerCase().substring(0, 3))
  ) || currentOptions.value[0]

  // Обработка логики диалога
  let replies = []
  if (match) {
    if (match.isWrong) {
      replies = match.reply
    } else {
      currentNodeKey.value = match.next
      replies = dialogueTree[match.next].text
    }
  }

  // Бот отвечает по частям
  for (const t of replies) {
    isTyping.value = true
    await new Promise(r => setTimeout(r, 1200)) // Имитация набора текста
    history.value.push({
      role: 'ai',
      text: t,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
    isTyping.value = false
    scrollToBottom()
  }
}

onMounted(async () => {
  // Начальное приветствие по частям
  for (const t of dialogueTree.start.text) {
    isTyping.value = true
    await new Promise(r => setTimeout(r, 800))
    history.value.push({ role: 'ai', text: t, time: '12:00' })
    isTyping.value = false
    scrollToBottom()
  }
})
</script>

<style scoped>
/* Убираем стандартный скроллбар */
.hide-scrollbar::-webkit-scrollbar { display: none; }

/* Кастомный баббл для индикатора печатания */
.typing-bubble {
  background: #7986cb;
  padding: 10px 16px;
  border-radius: 18px 18px 18px 4px;
}

/* Стили для чистого инпута */
.custom-clean-input {
  background: white;
  border-radius: 30px;
  padding: 6px 8px 6px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.custom-clean-input :deep(.q-field__control) {
  background: transparent !important;
}

/* Кнопка отправки */
.send-btn-final {
  width: 26px;
  height: 26px;
  z-index: 2;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

:deep(.q-btn--disabled) {
  opacity: 1 !important;
}

/* Анимации списка сообщений */
.msg-list-enter-active {
  transition: all 0.4s ease-out;
}
.msg-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

/* Анимация ошибки */
.shake-error { animation: shake 0.4s; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

/* Плавный подъем уведомления */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }
</style>

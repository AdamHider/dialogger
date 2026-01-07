<template>
    <q-scroll-area
      ref="scrollArea"
      class="absolute-full"
      :content-style="{ minHeight: '100%', display: 'flex', flexDirection: 'column' }"
    >
      <div class="col-grow"></div>
  
      <div class="q-pa-md">
        <div
          v-for="msg in messages" :key="msg.id"
          :class="['row q-py-xs animate-fade', msg.sender === 'npc' ? '' : 'justify-end']"
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
              <span class="cursor-blink"></span>
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
  </template>
  
  <script setup>
  import { ref, watch, nextTick } from 'vue'
  
  const props = defineProps({
    messages: Array,
    currentPhrase: String,
    isTyping: Boolean
  })
  
  const scrollArea = ref(null)
  
  // Авто-скролл при изменении списка сообщений или фразы
  const scrollToBottom = () => {
    nextTick(() => {
      if (scrollArea.value) {
        const target = scrollArea.value.getScrollTarget()
        scrollArea.value.setScrollPosition('vertical', target.scrollHeight, 300)
      }
    })
  }
  
  // Следим за сообщениями и за тем, как пользователь «набирает» фразу
  watch(() => props.messages.length, scrollToBottom)
  watch(() => props.isTyping, (val) => { if (val) scrollToBottom() })
  </script>
  
  <style lang="scss" scoped>
  .chat-bubble-npc {
    background: white; border-radius: 18px 18px 18px 4px;
    padding: 12px 16px; max-width: 85%; color: #333;
  }
  .chat-bubble-user {
    background: $primary; color: white; border-radius: 18px 18px 4px 18px;
    padding: 12px 16px; max-width: 85%;
  }
  .phantom-bubble {
    border: 1.5px dashed rgba($primary, 0.3);
    color: $primary; border-radius: 18px 18px 4px 18px;
    padding: 10px 16px; opacity: 0.7;
  }
  .cursor-blink {
    animation: blink 1s infinite; margin-left: 4px;
    border-left: 2px solid $primary; height: 1.2em;
  }
  @keyframes blink { 50% { opacity: 0; } }
  .animate-fade { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  </style>
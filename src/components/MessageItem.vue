<template>
  <div class="row q-mb-md" :class="sent ? 'justify-end' : 'justify-start'">
    <div 
      :class="[
        'message-bubble shadow-transition', 
        sent ? 'sent' : 'received',
        isOption ? 'option-style' : 'shadow-2',
        isOptionActive ? 'option-active' : ''
      ]"
    >
      <div class="message-text">
        <slot>
          <div v-html="text"></div>
        </slot>
      </div>
      
      <div v-if="!isOption" class="message-info row items-center justify-end q-gutter-x-xs">
        <span class="time">{{ time }}</span>
        <q-icon v-if="sent" name="done_all" size="14px" class="status-icon" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: String,
  sent: Boolean,
  time: String,
  isOption: Boolean,       // Флаг: это подсказка?
  isOptionActive: Boolean  // Флаг: она сейчас выбрана?
})
</script>

<style scoped>
.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  position: relative;
  font-size: 15px;
  line-height: 1.4;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sent {
  background: white;
  color: #3f51b5;
  border-radius: 18px 18px 4px 18px;
}

.received {
  background: #7986cb;
  color: white;
  border-radius: 18px 18px 18px 4px;
}

/* Стили для подсказки (черновика) */
.option-style {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.3);
  box-shadow: none;
}

.option-active {
  background: white !important;
  color: #3f51b5 !important;
  border: 1px solid white !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.message-info {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.7;
}

.status-icon { color: #5c6bc0; }
.shadow-transition { transition: background 0.3s, transform 0.3s, box-shadow 0.3s; }
</style>
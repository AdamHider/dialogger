<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container style="padding: 0 !important">
      <router-view />
    </q-page-container>
    <q-footer bordered class="bg-grey-3 text-primary">
      <q-tabs no-caps active-color="primary" indicator-color="transparent" class="text-grey-8" >
        <q-route-tab exact to="/chat" label="Чат" />
        <q-route-tab exact to="/cryptogram" label="Криптограмма" />
        <q-route-tab exact to="/chat-temperature" label="Чат конструктор" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  script: [
    { src: 'https://accounts.google.com/gsi/client', async: true, defer: true },
  ],
})
</script>
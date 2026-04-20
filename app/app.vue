<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Sonner position="top-right" rich-colors :duration="3000" />
    <PromptDialog />
    <ConfirmDialog />
  </div>
</template>

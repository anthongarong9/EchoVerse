import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-14',
  devtools: { enabled: false },

  runtimeConfig: {
    public: {
      googleClientId: '',
      supabaseUrl: '',
      supabaseKey: '',
    },
  },

  build: { transpile: ['vuetify'] },
  vite: {
    plugins: [vuetify({ autoImport: true })],
    vue: { template: { transformAssetUrls } },
  },
})
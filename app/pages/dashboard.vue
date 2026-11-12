<script setup lang="ts">
import { getTracks, isStorageConfigured, type Track } from '~/composables/useMusicDb'

definePageMeta({ title: 'Dashboard' })

const user = useAuthUser()
const tracks = ref<Track[]>([])
const loading = ref(true)
const errorMsg = ref('')
const owner = computed(() => user.value?.sub || 'guest')

const recentTracks = computed(() => tracks.value.slice(0, 4))
const totalSize = computed(() => tracks.value.reduce((sum, track) => sum + track.size, 0))
const formattedTotalSize = computed(() => {
  if (!totalSize.value) return '0 MB'
  if (totalSize.value < 1024 * 1024) return `${Math.max(1, Math.round(totalSize.value / 1024))} KB`
  return `${(totalSize.value / 1024 / 1024).toFixed(1)} MB`
})

const firstName = computed(() => user.value?.name?.trim().split(/\s+/)[0] || 'there')

onMounted(async () => {
  if (!isStorageConfigured()) {
    loading.value = false
    errorMsg.value = 'Cloud storage is not configured, so your music library could not be loaded.'
    return
  }

  try {
    tracks.value = await getTracks(owner.value)
  } catch {
    errorMsg.value = 'Could not load your music library. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Recently added'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatSize(bytes: number) {
  if (!bytes) return '—'
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <div class="dashboard">
    <v-alert
      v-if="errorMsg"
      type="warning"
      variant="tonal"
      rounded="lg"
      class="mb-5"
      closable
      @click:close="errorMsg = ''"
    >
      {{ errorMsg }}
    </v-alert>

    <section class="welcome-banner">
      <div class="welcome-content">
        <div class="eyebrow">
          <v-icon size="16">mdi-waveform</v-icon>
          YOUR MUSIC, YOUR SPACE
        </div>
        <h1>Good to see you, {{ firstName }}<span class="wave-emoji"> ✨</span></h1>
        <p>Your personal corner for the songs you love. Pick a track and make some noise.</p>
        <v-btn
          to="/wavesurfer"
          color="white"
          variant="flat"
          rounded="lg"
          size="large"
          append-icon="mdi-arrow-right"
          class="explore-button"
        >
          Open music library
        </v-btn>
      </div>
      <div class="banner-art" aria-hidden="true">
        <div class="art-disc"><v-icon>mdi-music-note</v-icon></div>
        <div class="banner-wave">
          <span
            v-for="(height, index) in [24, 38, 18, 50, 30, 58, 22, 44, 32, 54, 20, 40, 28]"
            :key="index"
            :style="{ height: `${height}px` }"
          />
        </div>
      </div>
    </section>

    <section class="stats-grid" aria-label="Music library overview">
      <v-card class="stat-card" rounded="lg" elevation="0">
        <div class="stat-icon tracks-icon"><v-icon>mdi-music-box-multiple</v-icon></div>
        <div class="stat-copy">
          <span class="stat-label">Tracks in library</span>
          <v-progress-linear v-if="loading" indeterminate rounded class="stat-loader" />
          <strong v-else>{{ tracks.length }}</strong>
        </div>
        <span class="stat-decoration">♫</span>
      </v-card>

      <v-card class="stat-card" rounded="lg" elevation="0">
        <div class="stat-icon storage-icon"><v-icon>mdi-harddisk</v-icon></div>
        <div class="stat-copy">
          <span class="stat-label">Storage used</span>
          <v-progress-linear v-if="loading" indeterminate rounded class="stat-loader" />
          <strong v-else>{{ formattedTotalSize }}</strong>
        </div>
        <span class="stat-decoration">♪</span>
      </v-card>

      <v-card class="stat-card" rounded="lg" elevation="0">
        <div class="stat-icon account-icon"><v-icon>mdi-account-music</v-icon></div>
        <div class="stat-copy">
          <span class="stat-label">Signed in as</span>
          <strong class="account-email">{{ user?.email || 'Google account' }}</strong>
        </div>
        <v-avatar v-if="user?.picture" size="36" class="stat-avatar">
          <v-img :src="user.picture" :alt="user.name" />
        </v-avatar>
      </v-card>
    </section>

    <v-row class="content-row">
      <v-col cols="12" lg="7">
        <v-card class="content-card recent-card" rounded="lg" elevation="0">
          <div class="section-heading">
            <div>
              <span class="section-kicker">YOUR COLLECTION</span>
              <h2>Recently added</h2>
            </div>
            <v-btn to="/wavesurfer" variant="text" color="primary" append-icon="mdi-arrow-right">
              View library
            </v-btn>
          </div>

          <v-progress-linear v-if="loading" indeterminate rounded class="mb-4" />

          <div v-else-if="recentTracks.length" class="recent-list">
            <NuxtLink
              v-for="(track, index) in recentTracks"
              :key="track.id"
              to="/wavesurfer"
              class="recent-track"
            >
              <div class="track-art" :class="`track-art-${index + 1}`">
                <v-icon>mdi-music-note</v-icon>
              </div>
              <div class="track-info">
                <span class="track-title">{{ track.name }}</span>
                <span class="track-meta">{{ formatDate(track.created_at) }} · {{ formatSize(track.size) }}</span>
              </div>
              <v-icon class="track-action" size="20">mdi-play-circle-outline</v-icon>
            </NuxtLink>
          </div>

          <div v-else class="empty-collection">
            <div class="empty-icon"><v-icon size="28">mdi-music-note-plus</v-icon></div>
            <h3>Your collection starts here</h3>
            <p>Add your first audio track and it’ll show up here.</p>
            <v-btn to="/wavesurfer" color="primary" variant="tonal" rounded="lg" prepend-icon="mdi-upload">
              Add your first track
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="content-card tip-card" rounded="lg" elevation="0">
          <div class="tip-graphic" aria-hidden="true">
            <span v-for="(height, index) in [20, 34, 48, 28, 54, 38, 22, 44, 30]" :key="index" :style="{ height: `${height}px` }" />
          </div>
          <span class="section-kicker">A LITTLE INSPIRATION</span>
          <h2>Every playlist has a first track.</h2>
          <p>Upload your favorite audio and watch its waveform come to life in your library.</p>
          <v-btn to="/wavesurfer" color="primary" variant="outlined" rounded="lg" append-icon="mdi-arrow-right">
            Explore your library
          </v-btn>
          <div class="tip-note"><v-icon size="16">mdi-lightbulb-outline</v-icon> Audio files up to 20 MB are supported.</div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.dashboard {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: clamp(12px, 2.5vw, 32px);
}

.welcome-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 270px;
  overflow: hidden;
  padding: clamp(28px, 5vw, 54px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background:
    radial-gradient(ellipse at 82% 18%, rgba(162, 125, 255, 0.32), transparent 34%),
    linear-gradient(115deg, #21183f 0%, #34205e 52%, #513190 100%);
  color: #fff;
}

.welcome-content {
  position: relative;
  z-index: 1;
  max-width: 590px;
}

.eyebrow,
.section-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c5b4ff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.welcome-banner h1 {
  margin: 16px 0 8px;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -1.2px;
  line-height: 1.15;
}

.wave-emoji {
  white-space: nowrap;
}

.welcome-banner p {
  max-width: 460px;
  margin: 0 0 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  line-height: 1.65;
}

.explore-button {
  color: #35205f;
  font-weight: 700;
}

.banner-art {
  position: absolute;
  top: 50%;
  right: 7%;
  width: 300px;
  height: 230px;
  transform: translateY(-50%);
}

.art-disc {
  position: absolute;
  top: 0;
  right: 12px;
  display: grid;
  width: 205px;
  height: 205px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(197, 180, 255, 0.18) 0 18%, rgba(30, 21, 57, 0.18) 19% 23%, transparent 24%);
  box-shadow: 0 0 0 16px rgba(255, 255, 255, 0.035), 0 0 0 36px rgba(255, 255, 255, 0.025);
}

.art-disc .v-icon {
  color: rgba(255, 255, 255, 0.68);
  font-size: 52px;
}

.banner-wave,
.tip-graphic {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.banner-wave {
  position: absolute;
  right: -10px;
  bottom: 4px;
  left: -10px;
}

.banner-wave span,
.tip-graphic span {
  width: 5px;
  border-radius: 8px;
  background: linear-gradient(180deg, #d8c8ff, #8b69e6);
  opacity: 0.85;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.stat-card,
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgb(var(--v-theme-surface));
}

.stat-card {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  padding: 20px;
}

.stat-icon,
.empty-icon {
  display: grid;
  flex: none;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 14px;
}

.tracks-icon {
  background: rgba(139, 105, 230, 0.17);
  color: #bda7ff;
}

.storage-icon {
  background: rgba(76, 175, 140, 0.16);
  color: #7bd5b3;
}

.account-icon {
  background: rgba(93, 164, 232, 0.16);
  color: #8ec5ff;
}

.stat-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 12px;
}

.stat-copy strong {
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  font-size: 22px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-copy strong.account-email {
  max-width: 100%;
  font-size: 14px;
}

.stat-decoration {
  position: absolute;
  right: 16px;
  bottom: -16px;
  color: rgba(255, 255, 255, 0.045);
  font-size: 72px;
  line-height: 1;
}

.stat-avatar {
  flex: none;
  margin-left: auto;
}

.stat-loader {
  width: 72px;
  margin-top: 6px;
}

.content-row {
  align-items: stretch;
}

.content-row > .v-col {
  display: flex;
}

.content-card {
  width: 100%;
  padding: clamp(20px, 3vw, 28px);
  border-radius: 18px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.section-heading h2,
.tip-card h2 {
  margin: 7px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.section-heading .section-kicker,
.tip-card .section-kicker {
  color: #a994ed;
  font-size: 10px;
}

.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-track {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
  padding: 12px 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: inherit;
  text-decoration: none;
  transition: background-color 160ms ease;
}

.recent-track:hover {
  background: rgba(255, 255, 255, 0.035);
}

.track-art {
  display: grid;
  flex: none;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 12px;
  color: white;
}

.track-art-1 {
  background: linear-gradient(135deg, #8058db, #44308b);
}

.track-art-2 {
  background: linear-gradient(135deg, #238f99, #24526f);
}

.track-art-3 {
  background: linear-gradient(135deg, #dc7f68, #8c4664);
}

.track-art-4 {
  background: linear-gradient(135deg, #d7a84c, #8e633a);
}

.track-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.track-title,
.track-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 600;
}

.track-meta {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 12px;
}

.track-action {
  flex: none;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.empty-collection {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  text-align: center;
}

.empty-icon {
  width: 54px;
  height: 54px;
  background: rgba(139, 105, 230, 0.17);
  color: #bda7ff;
}

.empty-collection h3 {
  margin: 14px 0 4px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 16px;
}

.empty-collection p,
.tip-card p {
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 13px;
  line-height: 1.6;
}

.empty-collection p {
  margin: 0 0 16px;
}

.tip-card {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: flex-start;
  background:
    radial-gradient(ellipse at 100% 0%, rgba(139, 105, 230, 0.14), transparent 42%),
    rgb(var(--v-theme-surface));
}

.tip-graphic {
  justify-content: flex-start;
  height: 58px;
  margin-bottom: 24px;
}

.tip-graphic span {
  width: 6px;
}

.tip-card h2 {
  max-width: 280px;
  margin-top: 10px;
  font-size: clamp(21px, 2.5vw, 27px);
}

.tip-card p {
  max-width: 350px;
  margin: 12px 0 20px;
}

.tip-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding-top: 28px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 11px;
}

@media (max-width: 900px) {
  .banner-art {
    right: 2%;
    opacity: 0.65;
    transform: translate(20%, -50%) scale(0.85);
  }

  .welcome-content {
    max-width: 72%;
  }
}

@media (max-width: 700px) {
  .dashboard {
    padding: 12px;
  }

  .welcome-banner {
    min-height: 240px;
    padding: 28px 24px;
    border-radius: 18px;
  }

  .welcome-content {
    max-width: 100%;
  }

  .welcome-banner p {
    max-width: 380px;
    font-size: 14px;
  }

  .banner-art {
    right: -70px;
    opacity: 0.3;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 14px 0;
  }

  .stat-card {
    min-height: 84px;
    padding: 16px;
  }

  .content-card {
    padding: 20px;
  }
}

@media (max-width: 400px) {
  .welcome-banner {
    min-height: 260px;
    padding: 24px 20px;
  }

  .welcome-banner h1 {
    font-size: 27px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-heading :deep(.v-btn) {
    margin-left: -8px;
  }

  .recent-track {
    gap: 10px;
  }
}
</style>

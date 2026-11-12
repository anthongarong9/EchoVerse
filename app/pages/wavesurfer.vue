<script setup lang="ts">
definePageMeta({ title: 'Music Library' })

const user = useAuthUser()
const owner = computed(() => user.value?.sub || 'guest')

// Player state
const waveRef = ref<HTMLElement | null>(null)
const ready = ref(false)
const playing = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const fileName = ref('')
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.8)
const zoomLevel = ref(0)
let wavesurfer: any = null
let autoPlayNext = false

// Library state
const tracks = ref<Track[]>([])
const searchQuery = ref('')
const filteredTracks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return tracks.value
  return tracks.value.filter((track) => track.name.toLocaleLowerCase().includes(query))
})
const currentId = ref<number | string | null>(null)
const pickedFiles = ref<File[] | File | null>(null)
const saving = ref(false)
const listLoading = ref(false)

onMounted(async () => {
  const WaveSurfer = (await import('wavesurfer.js')).default

  wavesurfer = WaveSurfer.create({
    container: waveRef.value as HTMLElement,
    waveColor: '#8270bc',
    progressColor: '#c4b5fd',
    cursorColor: '#f0abfc',
    cursorWidth: 2,
    height: 132,
    barWidth: 4,
    barGap: 3,
    barRadius: 4,
    normalize: true,
  })

  wavesurfer.on('ready', (d: number) => {
    ready.value = true
    loading.value = false
    duration.value = d
    wavesurfer.setVolume(volume.value)
    if (autoPlayNext) {
      autoPlayNext = false
      wavesurfer.play()
    }
  })
  wavesurfer.on('timeupdate', (t: number) => (currentTime.value = t))
  wavesurfer.on('play', () => (playing.value = true))
  wavesurfer.on('pause', () => (playing.value = false))
  wavesurfer.on('finish', () => (playing.value = false))
  wavesurfer.on('error', () => showLoadError())

  if (!isStorageConfigured()) {
    errorMsg.value =
      'Cloud storage is not set up. Add NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY to your .env file, then restart the server.'
    return
  }
  await refreshList()
})

onBeforeUnmount(() => {
  if (wavesurfer) wavesurfer.destroy()
})

watch(volume, (v) => {
  if (wavesurfer) wavesurfer.setVolume(v)
})
watch(zoomLevel, (z) => {
  if (wavesurfer && ready.value) wavesurfer.zoom(z)
})

/* ---------- Library (songs saved in the cloud) ---------- */

async function refreshList() {
  listLoading.value = true
  try {
    tracks.value = await getTracks(owner.value)
  } catch {
    errorMsg.value = 'Could not load your songs. Check your internet connection and storage setup.'
  } finally {
    listLoading.value = false
  }
}

async function onFilesPicked(value: File | File[] | null) {
  const files = Array.isArray(value) ? value : value ? [value] : []
  if (!files.length) return
  if (!isStorageConfigured()) return

  errorMsg.value = ''
  saving.value = true
  let skipped = 0

  for (const file of files) {
    if (!file.type.startsWith('audio/')) {
      skipped++
      continue
    }
    if (file.size > 20 * 1024 * 1024) {
      errorMsg.value = `"${file.name}" is bigger than 20 MB.`
      continue
    }
    try {
      await saveTrack(file, owner.value)
    } catch {
      errorMsg.value = `Could not upload "${file.name}". Check your internet connection and try again.`
      break
    }
  }

  if (skipped && !errorMsg.value) {
    errorMsg.value = `${skipped} file(s) skipped because they are not audio files.`
  }
  saving.value = false
  pickedFiles.value = null
  await refreshList()
}

async function addSample() {
  if (!isStorageConfigured()) return
  errorMsg.value = ''
  saving.value = true
  try {
    const file = new File([makeSampleWav()], 'Sample sound.wav', { type: 'audio/wav' })
    await saveTrack(file, owner.value)
    await refreshList()
  } catch {
    errorMsg.value = 'Could not save the sample sound.'
  } finally {
    saving.value = false
  }
}

async function deleteTrack(track: Track) {
  if (!confirm(`Delete "${track.name}"?`)) return
  try {
    await removeTrack(track)
    if (currentId.value === track.id) {
      wavesurfer.empty()
      resetState()
      currentId.value = null
      fileName.value = ''
    }
    await refreshList()
  } catch {
    errorMsg.value = 'Could not delete that song.'
  }
}

/* ---------- Player ---------- */

function resetState() {
  errorMsg.value = ''
  ready.value = false
  playing.value = false
  currentTime.value = 0
  duration.value = 0
  zoomLevel.value = 0
}

function showLoadError() {
  loading.value = false
  ready.value = false
  errorMsg.value = 'Could not load that song. Check your internet connection or try another file.'
}

async function playTrack(track: Track) {
  resetState()
  currentId.value = track.id
  fileName.value = track.name
  loading.value = true
  autoPlayNext = true
  try {
    await wavesurfer.load(track.url)
  } catch {
    showLoadError()
  }
}

/* ---------- Helpers ---------- */

// Builds a 4-second WAV file in the browser: one beep per second, rising pitch
function makeSampleWav(): Blob {
  const sampleRate = 22050
  const seconds = 4
  const total = sampleRate * seconds
  const buffer = new ArrayBuffer(44 + total * 2)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + total * 2, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, total * 2, true)

  for (let i = 0; i < total; i++) {
    const t = i / sampleRate
    const freq = 220 + 110 * Math.floor(t)
    const fade = 1 - (t % 1)
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.6 * fade
    view.setInt16(44 + i * 2, sample * 32767, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}
</script>

<template>
  <v-row class="music-library">
    <!-- Player (shows first on mobile) -->
    <v-col cols="12" md="7" class="order-md-2">
      <v-card rounded="xl" class="pa-4 player-card">
        <div class="player-heading">
          <div class="player-heading-icon"><v-icon>mdi-waveform</v-icon></div>
          <div>
            <div class="section-eyebrow">YOUR LISTENING SPACE</div>
            <div class="text-h6 font-weight-bold">Now Playing</div>
          </div>
          <v-spacer />
          <v-chip v-if="ready" size="small" variant="tonal" color="primary" prepend-icon="mdi-circle">
            {{ playing ? 'Playing' : 'Ready' }}
          </v-chip>
        </div>

        <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-4" closable @click:close="errorMsg = ''">
          {{ errorMsg }}
        </v-alert>

        <v-progress-linear v-if="loading" indeterminate class="mb-2" />

        <!-- The waveform is drawn inside this div -->
        <v-sheet rounded="xl" class="waveform-shell">
          <div class="waveform-glow" aria-hidden="true" />
          <div ref="waveRef" class="waveform-canvas" />
          <div v-if="!ready && !loading" class="waveform-empty">
            <div class="waveform-empty-icon"><v-icon size="26">mdi-waveform</v-icon></div>
            <span>Pick a track to bring its waveform to life</span>
          </div>
        </v-sheet>

        <div v-if="ready" class="track-progress mt-4">
          <div class="now-playing-info">
            <v-icon size="18" color="primary">mdi-music-note</v-icon>
            <span class="text-truncate font-weight-medium">{{ fileName }}</span>
          </div>
          <span class="track-time">{{ formatTime(currentTime) }} <span class="time-divider">/</span> {{ formatTime(duration) }}</span>
        </div>

        <v-row class="player-controls mt-3" density="compact">
          <v-col cols="6">
            <v-btn
              block
              size="large"
              color="primary"
              rounded="lg"
              :prepend-icon="playing ? 'mdi-pause' : 'mdi-play'"
              :disabled="!ready"
              @click="wavesurfer.playPause()"
            >
              {{ playing ? 'Pause' : 'Play' }}
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              block
              size="large"
              variant="tonal"
              rounded="lg"
              prepend-icon="mdi-stop"
              :disabled="!ready"
              @click="wavesurfer.stop()"
            >
              Stop
            </v-btn>
          </v-col>
        </v-row>

        <div class="slider-controls">
          <v-slider
            v-model="volume"
            label="Volume"
            min="0"
            max="1"
            step="0.05"
            prepend-icon="mdi-volume-high"
            hide-details
          />
          <v-slider
            v-model="zoomLevel"
            label="Zoom"
            min="0"
            max="200"
            step="10"
            prepend-icon="mdi-magnify-plus-outline"
            :disabled="!ready"
            hide-details
          />
        </div>
      </v-card>
    </v-col>

    <!-- Library list -->
    <v-col cols="12" md="5" class="order-md-1">
      <v-card rounded="xl" class="pa-4 library-card">
        <div class="library-heading">
          <div class="library-title">
            <div class="section-eyebrow">COLLECTION</div>
            <div class="d-flex align-center ga-2">
              <div class="text-h6 font-weight-bold">My Music</div>
              <v-chip size="small" variant="tonal" color="primary">{{ tracks.length }}</v-chip>
            </div>
          </div>
          <v-btn
            icon="mdi-sine-wave"
            aria-label="Add sample sound"
            variant="tonal"
            color="primary"
            :disabled="saving"
            @click="addSample"
          />
        </div>

        <v-file-input
          v-model="pickedFiles"
          label="Upload audio files"
          accept="audio/*"
          multiple
          prepend-icon=""
          prepend-inner-icon="mdi-upload"
          variant="outlined"
          :loading="saving"
          :disabled="saving"
          hide-details
          @update:model-value="onFilesPicked"
        />

        <v-text-field
          v-model="searchQuery"
          class="track-search mt-4"
          label="Search your songs"
          placeholder="Search by song name"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          hide-details
        />

        <div class="list-summary">
          <span>{{ searchQuery ? `${filteredTracks.length} search results` : 'YOUR TRACKS' }}</span>
          <v-progress-circular v-if="listLoading" indeterminate color="primary" size="16" width="2" />
        </div>

        <v-list v-if="filteredTracks.length" lines="two" class="track-list">
          <v-list-item
            v-for="(track, index) in filteredTracks"
            :key="track.id"
            :active="currentId === track.id"
            rounded="xl"
            :class="['track-item', { 'track-item-active': currentId === track.id }]"
            @click="playTrack(track)"
          >
            <template #prepend>
              <div class="track-cover" :class="`cover-${index % 4}`">
                <v-icon size="20">{{ currentId === track.id && playing ? 'mdi-volume-high' : 'mdi-music-note' }}</v-icon>
              </div>
            </template>
            <v-list-item-title>{{ track.name }}</v-list-item-title>
            <v-list-item-subtitle>
              <span>{{ formatSize(track.size) }}</span>
              <span class="track-meta-dot">·</span>
              <span>{{ new Date(track.created_at).toLocaleDateString() }}</span>
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click.stop="deleteTrack(track)"
              />
            </template>
          </v-list-item>
        </v-list>

        <div v-else-if="!listLoading" class="library-empty">
          <v-icon size="34" class="mb-2">{{ searchQuery ? 'mdi-magnify-close' : 'mdi-music-off' }}</v-icon>
          <div class="empty-title">{{ searchQuery ? 'No matching songs' : 'Your library is waiting' }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ searchQuery ? 'Try another song name.' : 'Upload audio to start building your collection.' }}
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.music-library {
  align-items: flex-start;
}

.music-library > .v-col {
  min-width: 0;
}

.player-card,
.library-card {
  min-width: 0;
  height: 100%;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.035), transparent 42%),
    rgb(var(--v-theme-surface));
}

.player-heading,
.library-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-bottom: 20px;
}

.player-heading-icon {
  display: grid;
  flex: none;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}

.section-eyebrow {
  margin-bottom: 3px;
  color: rgba(var(--v-theme-on-surface), 0.53);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.15px;
}

.waveform-shell {
  position: relative;
  display: flex;
  min-height: 190px;
  align-items: center;
  overflow: hidden;
  padding: 18px;
  border: 1px solid rgba(196, 181, 253, 0.17);
  background:
    radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.14), transparent 64%),
    linear-gradient(135deg, rgba(33, 25, 57, 0.9), rgba(22, 21, 33, 0.98));
}

.waveform-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 65%;
  height: 1px;
  background: rgba(196, 181, 253, 0.1);
  box-shadow: 0 0 32px 12px rgba(139, 92, 246, 0.12);
  transform: translate(-50%, -50%);
}

.waveform-canvas {
  z-index: 1;
  width: 100%;
  min-width: 0;
}

.waveform-empty {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 14px;
  left: 12px;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  text-align: center;
  pointer-events: none;
}

.waveform-empty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(196, 181, 253, 0.22);
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.14);
  color: #c4b5fd;
}

.track-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.now-playing-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.now-playing-info > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-time {
  flex: none;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.time-divider {
  color: rgba(var(--v-theme-on-surface), 0.35);
}

.player-controls :deep(.v-btn) {
  min-height: 46px;
  font-weight: 600;
}

.slider-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
  padding: 14px 12px 4px;
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.library-heading {
  justify-content: space-between;
}

.library-title {
  min-width: 0;
}

.track-search :deep(.v-field) {
  background: rgba(var(--v-theme-on-surface), 0.025);
}

.list-summary {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.1px;
}

.track-list {
  max-height: 420px;
  overflow-y: auto;
  padding: 0;
  background: transparent;
}

.track-item {
  margin-bottom: 4px;
  padding: 8px 6px;
  transition: background-color 140ms ease;
}

.track-item:hover {
  background: rgba(var(--v-theme-primary), 0.07);
}

.track-item-active {
  background: rgba(var(--v-theme-primary), 0.12);
}

.track-item :deep(.v-list-item__prepend) {
  padding-inline-end: 12px;
}

.track-item :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 600;
}

.track-item :deep(.v-list-item-subtitle) {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 11px;
}

.track-cover {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  color: white;
}

.cover-0 {
  background: linear-gradient(135deg, #8062ca, #48377e);
}

.cover-1 {
  background: linear-gradient(135deg, #29979b, #24526f);
}

.cover-2 {
  background: linear-gradient(135deg, #dc7f68, #8c4664);
}

.cover-3 {
  background: linear-gradient(135deg, #d7a84c, #8e633a);
}

.track-meta-dot {
  opacity: 0.55;
}

.library-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 20px 8px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  text-align: center;
}

.library-empty .v-icon {
  color: rgba(var(--v-theme-primary), 0.8);
}

.empty-title {
  margin-bottom: 5px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .music-library {
    flex-direction: column;
  }

  .music-library > .v-col {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
  }

  .player-card,
  .library-card {
    height: auto;
  }
}

@media (max-width: 600px) {
  .player-card,
  .library-card {
    padding: 16px !important;
    border-radius: 18px !important;
  }

  .player-heading,
  .library-heading {
    margin-bottom: 16px;
  }

  .waveform-shell {
    min-height: 170px;
    padding: 10px;
  }

  .track-progress {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .slider-controls {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 12px 12px 4px;
  }

  .track-list {
    max-height: 50vh;
  }
}
</style>
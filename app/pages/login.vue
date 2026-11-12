<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const loading = ref(false)
const errorMsg = ref('')
const isRegisterMode = ref(false)

function loginWithGoogle() {
  errorMsg.value = ''

  if (!config.public.googleClientId) {
    errorMsg.value = 'Google Client ID is missing. Check NUXT_PUBLIC_GOOGLE_CLIENT_ID.'
    return
  }

  const google = (window as any).google
  if (!google?.accounts?.oauth2) {
    errorMsg.value = 'Google Sign-In is still loading. Please try again in a moment.'
    return
  }

  loading.value = true

  const client = google.accounts.oauth2.initTokenClient({
    client_id: config.public.googleClientId,
    scope: 'openid email profile',
    callback: async (response: any) => {
      if (response.error) {
        loading.value = false
        errorMsg.value =
          response.error === 'access_denied'
            ? 'Sign-in was cancelled. You did not allow access.'
            : 'Sign-in failed. Please try again.'
        return
      }

      try {
        const userInfo = await $fetch<any>('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        })
        sessionStorage.setItem('google_user', JSON.stringify(userInfo))
        sessionStorage.setItem('google_token', response.access_token)
        useAuthUser().value = userInfo
        await navigateTo('/dashboard')
      } catch {
        errorMsg.value = 'Could not load your Google profile. Please try again.'
      } finally {
        loading.value = false
      }
    },
    error_callback: (err: any) => {
      loading.value = false
      if (err?.type === 'popup_closed') {
        errorMsg.value = 'Sign-in was cancelled. The Google window was closed.'
      } else if (err?.type === 'popup_failed_to_open') {
        errorMsg.value = 'The sign-in popup was blocked. Allow popups for this site and try again.'
      } else {
        errorMsg.value = 'Sign-in failed. Please try again.'
      }
    },
  })

  client.requestAccessToken()
}
</script>

<template>
  <v-app theme="light" class="auth-shell">
    <v-main>
      <v-container class="auth-container fill-height" fluid>
        <v-card class="auth-card" rounded="xl" elevation="0">
          <v-row no-gutters class="fill-height">
            <v-col cols="12" md="5" class="brand-panel">
              <NuxtLink to="/login" class="brand-lockup">
                <v-avatar color="white" size="42" rounded="lg">
                  <v-icon color="deep-purple-darken-2" size="25">mdi-music-note</v-icon>
                </v-avatar>
                <span>EchoVerse</span>
              </NuxtLink>

              <div class="brand-copy">
                <div class="soundwave" aria-hidden="true">
                  <span
                    v-for="(height, index) in [18, 30, 44, 24, 38, 52, 28, 42, 20, 34, 16]"
                    :key="index"
                    :style="{ height: `${height}px` }"
                  />
                </div>
                <h2>Your sound.<br />Your space.</h2>
                <p>A home for the music you love, all in one place.</p>
              </div>

              <div class="brand-footer">
                <v-icon size="18">mdi-shield-check-outline</v-icon>
                <span>Quick, secure sign-in with Google</span>
              </div>
              <div class="glow glow-one" />
              <div class="glow glow-two" />
            </v-col>

            <v-col cols="12" md="7" class="form-panel">
              <div class="form-content">
                <div class="mobile-brand">
                  <v-avatar color="deep-purple-lighten-5" size="42" rounded="lg">
                    <v-icon color="deep-purple-darken-2" size="25">mdi-music-note</v-icon>
                  </v-avatar>
                  <span>EchoVerse</span>
                </div>

                <div class="form-eyebrow">{{ isRegisterMode ? 'GET STARTED' : 'WELCOME TO ECHOVERSE' }}</div>
                <h1>{{ isRegisterMode ? 'Create your account' : 'Welcome back' }}</h1>
                <p class="form-description">
                  {{ isRegisterMode ? 'Join EchoVerse and bring your music together.' : 'Sign in to pick up where the music left off.' }}
                </p>

                <v-alert
                  v-if="errorMsg"
                  type="error"
                  variant="tonal"
                  rounded="lg"
                  class="mb-5"
                  closable
                  @click:close="errorMsg = ''"
                >
                  {{ errorMsg }}
                </v-alert>

                <v-btn
                  class="google-button"
                  prepend-icon="mdi-google"
                  variant="flat"
                  rounded="lg"
                  block
                  size="large"
                  :loading="loading"
                  @click="loginWithGoogle"
                >
                  {{ isRegisterMode ? 'Sign up with Google' : 'Continue with Google' }}
                </v-btn>

                <div class="secure-note">
                  <v-icon size="16">mdi-lock-outline</v-icon>
                  <span>We’ll never post or share anything without your permission.</span>
                </div>

                <div class="mode-switch">
                  {{ isRegisterMode ? 'Already have an account?' : 'New to EchoVerse?' }}
                  <button type="button" :disabled="loading" @click="isRegisterMode = !isRegisterMode">
                    {{ isRegisterMode ? 'Sign in' : 'Create an account' }}
                  </button>
                </div>

                <p class="signup-note">
                  {{ isRegisterMode
                    ? 'Your account is created securely through Google when you continue.'
                    : 'New here? Continuing with Google will create your account automatically.' }}
                </p>
              </div>
              <div class="form-bottom">Made for the music in you <span>♪</span></div>
            </v-col>
          </v-row>
        </v-card>
        <div class="page-caption">A little more rhythm in every day.</div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-shell {
  background:
    radial-gradient(ellipse at 8% 12%, rgba(196, 181, 253, 0.28), transparent 34%),
    radial-gradient(ellipse at 95% 90%, rgba(165, 180, 252, 0.22), transparent 32%),
    #f7f7fb;
}

.auth-container {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 4vw, 48px) clamp(12px, 4vw, 24px) 20px;
}

.auth-card {
  width: 100%;
  max-width: 960px;
  height: clamp(480px, 72vh, 570px);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 28px 80px rgba(48, 38, 85, 0.13);
}

.auth-card > :deep(.v-row) {
  height: 100%;
}

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: clamp(24px, 4vw, 36px);
  color: #fff;
  background: linear-gradient(150deg, #6d4bd1 0%, #5035ad 52%, #392782 100%);
}

.brand-lockup,
.mobile-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.4px;
  text-decoration: none;
}

.brand-copy {
  position: relative;
  z-index: 1;
  margin: 34px 0 42px;
}

.soundwave {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 58px;
  margin-bottom: 32px;
}

.soundwave span {
  width: 5px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.78);
}

.brand-copy h2 {
  margin: 0;
  font-size: clamp(32px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -1.6px;
  line-height: 1.12;
}

.brand-copy p {
  max-width: 260px;
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 15px;
  line-height: 1.65;
}

.brand-footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}

.glow {
  position: absolute;
  width: 230px;
  height: 230px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.glow-one {
  right: -120px;
  top: 100px;
  box-shadow: 0 0 0 32px rgba(255, 255, 255, 0.035), 0 0 0 65px rgba(255, 255, 255, 0.025);
}

.glow-two {
  bottom: -180px;
  left: -120px;
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 5vw, 54px) clamp(20px, 6vw, 76px) 28px;
}

.form-content {
  width: 100%;
  max-width: 390px;
  margin: auto;
}

.mobile-brand {
  display: none;
  margin-bottom: 42px;
  color: #30264f;
}

.form-eyebrow {
  color: #7657c7;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.6px;
}

.form-content h1 {
  margin: 10px 0 0;
  color: #25213a;
  font-size: clamp(29px, 3vw, 36px);
  font-weight: 700;
  letter-spacing: -1.2px;
  line-height: 1.2;
}

.form-description {
  margin: 12px 0 30px;
  color: #777487;
  font-size: 14px;
  line-height: 1.6;
}

.google-button {
  height: 54px;
  border: 1px solid #e6e3ed;
  color: #302b3e;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.google-button:hover {
  border-color: #b7a5e8;
  background: #faf8ff;
}

.secure-note {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 7px;
  margin-top: 16px;
  color: #9290a0;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.secure-note .v-icon {
  flex: none;
}

.mode-switch {
  margin-top: 34px;
  color: #777487;
  font-size: 13px;
  text-align: center;
}

.mode-switch button {
  margin-left: 4px;
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: #6848bf;
  cursor: pointer;
  font-weight: 700;
}

.mode-switch button:disabled {
  cursor: default;
  opacity: 0.55;
}

.signup-note {
  margin: 14px 0 0;
  color: #a09eaa;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.form-bottom {
  margin-top: 42px;
  color: #a09eaa;
  font-size: 11px;
  text-align: center;
}

.form-bottom span {
  color: #7657c7;
}

.page-caption {
  margin-top: 18px;
  color: #9895a8;
  font-size: 12px;
  letter-spacing: 0.2px;
}

@media (max-width: 959px) {
  .auth-card {
    height: auto;
  }

  .brand-panel {
    min-height: 230px;
    padding: 28px 32px;
  }

  .brand-copy {
    margin: 30px 0 0;
  }

  .brand-copy h2 {
    font-size: 30px;
  }

  .brand-copy p,
  .soundwave,
  .brand-footer {
    display: none;
  }
}

@media (max-width: 599px) {
  .auth-container {
    padding: 20px 16px;
  }

  .auth-card {
    min-height: 0;
    border-radius: 22px !important;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    min-height: 0;
    padding: clamp(24px, 7vw, 32px) clamp(20px, 7vw, 26px) 24px;
  }

  .mobile-brand {
    display: flex;
    margin-bottom: 38px;
  }

  .form-content h1 {
    font-size: 31px;
  }

  .form-bottom {
    margin-top: 34px;
  }

  .page-caption {
    margin-top: 14px;
  }
}
</style>

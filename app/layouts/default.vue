<script setup lang="ts">
const drawer = ref<boolean | null>(null)
const route = useRoute()
const user = useAuthUser()

const navItems = [
  { title: 'Dashboard', subtitle: 'Your music overview', icon: 'mdi-view-dashboard-outline', to: '/dashboard' },
  { title: 'Music Library', subtitle: 'Browse and play tracks', icon: 'mdi-music-box-multiple', to: '/wavesurfer' },
]

function handleLogout() {
  clearAuthUser()
  navigateTo('/login')
}

function closeDrawer() {
  drawer.value = false
}
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" width="280" class="app-drawer">
      <div class="drawer-brand">
        <NuxtLink to="/dashboard" class="brand-link" @click="closeDrawer">
          <v-avatar color="primary" size="42" rounded="lg">
            <v-icon color="white">mdi-music-note</v-icon>
          </v-avatar>
          <span class="brand-name">EchoVerse</span>
        </NuxtLink>
        <span class="brand-caption">YOUR PERSONAL MUSIC SPACE</span>
      </div>

      <div class="nav-caption">MENU</div>
      <v-list nav class="nav-list">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :subtitle="item.subtitle"
          rounded="lg"
          color="primary"
          class="nav-item"
          @click="closeDrawer"
        />
      </v-list>

      <template #append>
        <div v-if="user" class="drawer-profile">
          <v-avatar size="40" class="profile-avatar">
            <v-img v-if="user.picture" :src="user.picture" :alt="user.name" />
            <span v-else>{{ user.name?.charAt(0) || 'U' }}</span>
          </v-avatar>
          <div class="profile-copy">
            <div class="profile-name">{{ user.name }}</div>
            <div class="profile-email">{{ user.email }}</div>
          </div>
          <v-icon size="18" class="profile-status">mdi-check-circle</v-icon>
        </div>
        <div v-else class="drawer-profile">
          <v-avatar size="40" color="surface-variant"><v-icon>mdi-account</v-icon></v-avatar>
          <div class="profile-copy"><div class="profile-name">Guest</div></div>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar flat class="app-bar">
      <v-app-bar-nav-icon aria-label="Toggle navigation" class="menu-button" @click="drawer = !drawer" />
      <div class="bar-title">
        <span class="bar-eyebrow">ECHOVERSE</span>
        <v-toolbar-title>{{ route.meta.title || 'App' }}</v-toolbar-title>
      </div>
      <v-spacer />
      <div v-if="user" class="bar-user">
        <v-avatar size="34">
          <v-img v-if="user.picture" :src="user.picture" :alt="user.name" />
          <span v-else>{{ user.name?.charAt(0) || 'U' }}</span>
        </v-avatar>
        <span class="bar-user-name">{{ user.name }}</span>
      </div>
      <v-btn
        class="logout-button"
        variant="tonal"
        color="primary"
        rounded="lg"
        prepend-icon="mdi-logout"
        aria-label="Log out"
        @click="handleLogout"
      >
        <span class="logout-label">Log out</span>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-drawer {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
}

.drawer-brand {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 26px 22px 24px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
}

.brand-name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.brand-caption,
.nav-caption,
.bar-eyebrow {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.25px;
}

.brand-caption {
  padding-left: 54px;
  font-size: 9px;
  letter-spacing: 0.8px;
}

.nav-caption {
  padding: 14px 22px 8px;
}

.nav-list {
  padding: 4px 12px;
}

.nav-item {
  min-height: 58px;
  margin-bottom: 5px;
}

.nav-item :deep(.v-list-item__prepend > .v-icon) {
  opacity: 0.9;
}

.nav-item :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 600;
}

.nav-item :deep(.v-list-item-subtitle) {
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.62;
}

.drawer-profile {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 12px;
  padding: 14px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.profile-avatar {
  flex: none;
  background: rgba(var(--v-theme-primary), 0.18);
}

.profile-copy {
  min-width: 0;
  flex: 1;
}

.profile-name,
.profile-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  font-weight: 600;
}

.profile-email {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 11px;
}

.profile-status {
  flex: none;
  color: #63c99a;
}

.app-bar {
  padding: 0 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-background));
}

.menu-button {
  margin-right: 8px;
}

.bar-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.bar-eyebrow {
  font-size: 8px;
  letter-spacing: 1.5px;
}

.bar-title :deep(.v-toolbar-title) {
  min-width: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.3px;
  line-height: 1.35;
}

.bar-user {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-right: 18px;
}

.bar-user-name {
  max-width: 150px;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .app-bar {
    padding: 0 8px;
  }

  .menu-button {
    margin-right: 2px;
  }

  .bar-user {
    margin-right: 8px;
  }

  .bar-user-name,
  .bar-eyebrow,
  .logout-label {
    display: none;
  }

  .logout-button {
    min-width: 40px;
    padding: 0 8px;
  }

  .logout-button :deep(.v-btn__prepend) {
    margin-inline: 0;
  }
}
</style>
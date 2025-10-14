<template>
  <div class="text-page-container">
    <div class="content-wrapper">
      <section>
        <p class="intro">{{ $t('about_intro_1') }}</p>
        <p>{{ $t('about_intro_2') }}</p>
        <p>{{ $t('about_body_1') }}</p>
        <i18n-t keypath="about_body_2" tag="p">
          <template #link>
            <router-link to="/hub" class="font-semibold text-blue-400 hover:underline">
              {{ $t('about_body_2LinkText') }}
            </router-link>
          </template>
        </i18n-t>
      </section>

      <section class="invitation-section">
        <h1>{{ $t('about_title') }}</h1>
        <p>{{ $t('about_invitation_intro') }}</p>
        
        <div class="card">
          <h2>{{ $t('about_subtitle_parents') }}</h2>
          <p>{{ $t('about_text_parents') }}</p>
        </div>
        
        <div class="card">
          <h2>{{ $t('about_subtitle_educators') }}</h2>
          <i18n-t keypath="about_text_educators" tag="p">
            <template #link>
              <router-link to="/hub" class="font-semibold text-blue-400 hover:underline">
                {{ $t('about_text_educatorsLinkText') }}
              </router-link>
            </template>
          </i18n-t>
        </div>

        <p class="conclusion">{{ $t('about_conclusion') }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
// Скрипты здесь не нужны, но секция оставлена для будущего
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<style scoped>
/* :root можно было бы вынести в глобальные стили для будущего переключателя тем */
:root {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --heading-color: #ffffff;
  --accent-color: #88a4e8;
  --card-bg-color: #2c2c2c;
}

.text-page-container {
  background-color: var(--bg-color);
  color: var(--text-color);
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 40px 20px;
  box-sizing: border-box;
  font-family: sans-serif;
  line-height: 1.7;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

p {
  margin-bottom: 1.5em;
}

.intro {
  font-size: 1.2em;
  color: var(--heading-color);
  font-weight: 500;
}

.invitation-section {
  margin-top: 4em;
  padding-top: 2em;
  border-top: 1px solid var(--card-bg-color);
}

h1 {
  color: var(--heading-color);
  font-size: 2.2em;
  text-align: center;
  margin-bottom: 1em;
}

h2 {
  color: var(--accent-color);
  font-size: 1.3em;
  margin-bottom: 0.5em;
}

.card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 1.5em;
  margin-bottom: 2em;
}

.conclusion {
  text-align: center;
  font-size: 1.1em;
  font-weight: bold;
  margin-top: 3em;
}
</style>
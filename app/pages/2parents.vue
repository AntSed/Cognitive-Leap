<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue';
// @ts-ignore (Assuming useR2Uploader is auto-imported)
import { useR2Uploader } from '~/composables/useR2Uploader';
// @ts-ignore (Assuming useModalStore is auto-imported)
import { useModalStore } from '~/composables/useModalStore';
// @ts-ignore (Assuming useSupabaseClient and useSupabaseUser are auto-imported)
import { useSupabaseClient, useSupabaseUser } from '#imports';
import * as Tone from 'tone';

// --- Supabase & Uploader ---
const supabase = useSupabaseClient();
const authUser = useSupabaseUser();
const { upload, isLoading: isUploading, error: uploadError } = useR2Uploader();

// --- Local state for user profile ---
const currentUserProfile = ref<{ hub_role: string } | null>(null);

// --- Admin Check ---
const canEdit = computed(() => {
  return currentUserProfile.value?.hub_role === 'admin';
});

// --- Modal Store ---
const modalStore = useModalStore();
const mathGameMaterial = ref(null);
const mathGameMaterialId = 'cd7cc20c-1ef4-444d-86cd-d663497bcbfa';

// --- Reactive State for Page Assets (NEW STRUCTURE) ---
// We store an object with url and updated_at to build the cache-busting URL
const pageAssets = reactive<Record<string, { url: string; updated_at: string | null }>>({
  'landing-hook-bg': { url: 'https://i.imgur.com/qA1VwQk.jpeg', updated_at: null },
  'landing-steam-engine': { url: 'https://i.imgur.com/gWGmRzT.png', updated_at: null },
  'landing-electric-engine': { url: 'https://i.imgur.com/33bFvG9.png', updated_at: null },
  'landing-math-game-thumb': { url: 'https://i.imgur.com/7bXqR7a.png', updated_at: null } // Placeholder for game thumb
});

// --- Refs for File Inputs ---
const hookBgInput = ref<HTMLInputElement | null>(null);
const steamEngineInput = ref<HTMLInputElement | null>(null);
const electricEngineInput = ref<HTMLInputElement | null>(null);
const mathGameThumbInput = ref<HTMLInputElement | null>(null);

// --- Refs for Scrollytelling Animation ---
const steamTextBlock = ref<HTMLElement | null>(null);
const electricTextBlock = ref<HTMLElement | null>(null);
const steamEngineOpacity = ref(1);
const electricEngineOpacity = ref(0);

// --- Helper function for cache-busting ---
const getUrlWithCacheBust = (key: string) => {
  const asset = pageAssets[key];
  if (!asset) return '';
  if (asset.updated_at) {
    // If we have a timestamp, append it to bust the cache
    return `${asset.url}?t=${new Date(asset.updated_at).getTime()}`;
  }
  // Fallback to URL without timestamp
  return asset.url;
};


// --- Data Loading & Animation Setup ---
onMounted(async () => {
  // 1. Initialize Modal Listeners (for ESC key, etc.)
  modalStore.initializeModalListeners();

  // 2. Wake up AudioContext on first user interaction
  const resumeAudio = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      console.log('AudioContext resumed!');
    }
    // Remove listeners after first interaction
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };
  document.addEventListener('click', resumeAudio);
  document.addEventListener('keydown', resumeAudio);
  
  // 3. Fetch User Profile (for Admin check)
  if (authUser.value) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('hub_role')
      .eq('user_id', authUser.value.id)
      .single();
    
    if (profile) {
      currentUserProfile.value = profile;
    }
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }
  }

  // 4. Fetch Landing Page Assets (WITH updated_at)
  const { data: assetsData, error: assetsError } = await supabase
    .from('landing_page_assets')
    .select('asset_key, asset_url, updated_at'); // <-- Fetch updated_at

  if (assetsData) {
    for (const asset of assetsData) {
      if (asset.asset_key && asset.asset_url && pageAssets[asset.asset_key]) {
        pageAssets[asset.asset_key].url = asset.asset_url;
        pageAssets[asset.asset_key].updated_at = asset.updated_at; // <-- Store updated_at
      }
    }
  }
  if (assetsError) {
    console.error('Error fetching landing page assets:', assetsError);
  }

  // 5. Fetch Math Game Material (for Modal)
  const { data: materialData, error: materialError } = await supabase
    .from('learning_apps')
    .select('*')
    .eq('id', mathGameMaterialId)
    .single();

  if (materialData) {
    mathGameMaterial.value = materialData;
  } else {
    console.error('Error fetching math game material:', materialError);
  }

  // 6. Setup IntersectionObserver for Scrollytelling
  const observerOptions = { root: null, threshold: 0.5 };
  const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      
      const engine = entry.target.dataset.engine;
      if (engine === 'steam-engine') {
        steamEngineOpacity.value = 1;
        electricEngineOpacity.value = 0;
      } else if (engine === 'electric-engine') {
        steamEngineOpacity.value = 0;
        electricEngineOpacity.value = 1;
      }
    });
  };

  const observer = new IntersectionObserver(intersectionCallback, observerOptions);
  if (steamTextBlock.value) observer.observe(steamTextBlock.value);
  if (electricTextBlock.value) observer.observe(electricTextBlock.value);
});

// --- Logic for Image Uploading ---
const triggerFileInput = (inputRef: HTMLInputElement | null) => {
  inputRef?.click();
};

const handleFileChange = async (event: Event, materialId: string) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];

  const publicUrl = await upload(file, materialId); // This is just the URL, no timestamp
  
  if (publicUrl) {
    // Now, save to DB and get the NEW updated_at
    const { data, error: dbError } = await supabase
      .from('landing_page_assets')
      .upsert(
        { asset_key: materialId, asset_url: publicUrl },
        { onConflict: 'asset_key' }
      )
      .select('updated_at') // <-- Get the new timestamp back
      .single();
    
    if (dbError) {
      console.error('Failed to save new asset URL to DB:', dbError);
    } else if (data) {
      // SUCCESS: Update local state with new URL AND new timestamp
      pageAssets[materialId].url = publicUrl;
      pageAssets[materialId].updated_at = data.updated_at; // <-- This triggers cache bust
    }

  } else {
    console.error('Upload failed:', uploadError.value);
  }
  
  if (target) {
    target.value = ''; // Reset file input
  }
};

// --- Logic for Opening Game Modal ---
const openGameModal = () => {
  if (mathGameMaterial.value) {
    modalStore.open('modals/VuePlayerModal', { material: mathGameMaterial.value });
  } else {
    console.error('Cannot open modal: Math game material not loaded.');
    // Optionally show a user-facing error
  }
};
</script>

<template>
  <main class="text-gray-300 relative bg-gray-900"> <!-- Set base bg for the page -->

    <!-- Global Loading/Error Overlay -->
    <div
      v-if="isUploading || uploadError"
      class="fixed inset-0 z-[2100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-live="assertive"
    >
      <div v-if="isUploading" class="text-white text-lg font-bold">
        Загрузка...
      </div>
      <div v-if="uploadError" class="max-w-md bg-red-600 p-4 rounded-lg text-white text-center">
        <p class="font-bold">Ошибка загрузки:</p>
        <p class="text-sm">{{ uploadError }}</p>
        <button @click="uploadError = null" class="mt-2 bg-white text-red-700 px-3 py-1 rounded text-xs font-bold">
          OK
        </button>
      </div>
    </div>

    <!-- 1. ХУК (ЗАХВАТ) -->
    <section 
      id="hook" 
      class="h-screen relative flex flex-col justify-center items-center text-white bg-cover bg-center"
      :style="{ backgroundImage: `url(${getUrlWithCacheBust('landing-hook-bg')})` }"
    >
      <!-- Dark overlay -->
      <div class="absolute inset-0 bg-black/60 z-0"></div>

      <!-- Admin Edit Button -->
      <button 
        v-if="canEdit"
        @click="triggerFileInput(hookBgInput)" 
        class="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 p-2 rounded-lg text-xs backdrop-blur-sm transition-colors"
        title="Change Background Image"
      >
        Edit BG
      </button>
      <input 
        v-if="canEdit"
        type="file" 
        ref="hookBgInput" 
        @change="handleFileChange($event, 'landing-hook-bg')" 
        class="hidden" 
        accept="image/*" 
      />

      <div class="hero-text relative z-10 text-4xl md:text-5xl font-extrabold text-center h-32">
        <div class="hero-phrases">
          <span>"Моему ребенку скучно на уроках."</span>
          <span>"Он ненавидит ходить в школу."</span>
          <span>"Я боюсь, что он отстанет."</span>
          <span>"Мой ребенок такой умный... почему ему скучно?"</span>
        </div>
      </div>
      <div class="scroll-prompt absolute bottom-8 z-10 text-center text-lg">
        <p>Проблема не в вас. И не в нем.</p>
        <div class="arrow text-4xl">↓</div>
      </div>
    </section>

    <!-- 2. ПРОБЛЕМА (ДВИГАТЕЛИ) -->
    <section id="problem" class="max-w-6xl mx-auto flex flex-col md:flex-row py-24 px-4">
      <!-- Sticky Visuals -->
      <div class="sticky-visual md:flex-1 md:h-[100vh] md:sticky md:top-0 flex justify-center items-center h-96 relative">
        <!-- Admin Edit Buttons -->
        <button 
          v-if="canEdit"
          @click="triggerFileInput(steamEngineInput)" 
          class="absolute top-0 right-10 z-10 bg-gray-700/50 hover:bg-gray-700/80 p-2 rounded-lg text-xs transition-colors"
          title="Change Steam Engine Image"
        >
          Edit Steam
        </button>
        <button 
          v-if="canEdit"
          @click="triggerFileInput(electricEngineInput)" 
          class="absolute top-10 right-10 z-10 bg-gray-700/50 hover:bg-gray-700/80 p-2 rounded-lg text-xs transition-colors"
          title="Change Electric Engine Image"
        >
          Edit Electric
        </button>
        <input v-if="canEdit" type="file" ref="steamEngineInput" @change="handleFileChange($event, 'landing-steam-engine')" class="hidden" accept="image/*" />
        <input v-if="canEdit" type="file" ref="electricEngineInput" @change="handleFileChange($event, 'landing-electric-engine')" class="hidden" accept="image/*" />

        <!-- Engine Images with Crossfade -->
        <img
          :src="getUrlWithCacheBust('landing-steam-engine')"
          alt="Паровой двигатель"
          class="engine max-w-full md:max-w-md h-auto absolute transition-opacity duration-700"
          :style="{ opacity: steamEngineOpacity }"
        />
        <img
          :src="getUrlWithCacheBust('landing-electric-engine')"
          alt="Электродвигатель"
          class="engine max-w-full md:max-w-md h-auto absolute transition-opacity duration-700"
          :style="{ opacity: electricEngineOpacity }"
        />
      </div>
      
      <!-- Scrolling Text -->
      <div class="scroll-text md:flex-1 md:pl-12 text-lg">
        <div
          ref="steamTextBlock"
          class="text-block md:h-screen flex flex-col justify-center py-20 md:py-0"
          data-engine="steam-engine"
        >
          <h2 class="text-3xl md:text-4xl font-extrabold mb-6 text-left text-white">Традиционная школа —<br />как паровой двигатель.</h2>
          <ul class="list-['✓_'] pl-6 space-y-2">
            <li>Ее создали 200 лет назад для фабрик.</li>
            <li>Она работает на <strong class="text-red-400">страхе</strong> (КПД &lt; 25%).</li>
            <li>Один темп для всех: быстрым — скучно, медленным — стыдно.</li>
          </ul>
        </div>
        <div
          ref="electricTextBlock"
          class="text-block md:h-screen flex flex-col justify-center py-20 md:py-0"
          data-engine="electric-engine"
        >
          <h2 class="text-3xl md:text-4xl font-extrabold mb-6 text-left text-white">Cognitive Leap —<br />как электродвигатель.</h2>
          <ul class="list-['✓_'] pl-6 space-y-2">
            <li>Создан для XXI века.</li>
            <li>Работает на <strong class="text-green-400">любопытстве</strong> (КПД > 90%).</li>
            <li>Каждый идет в своем темпе, получая дофамин от игры.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 3. РЕШЕНИЕ (ПЛАТФОРМА IFRAME) -->
    <section id="solution" class="py-24 px-4 max-w-6xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-extrabold mb-4 text-white">Обучение, которое можно увидеть</h2>
      <p class="text-lg text-gray-300 max-w-3xl mx-auto">Вся школьная программа (10 лет) — на одной 3D-карте. Мы превратили ее в увлекательное приключение.</p>

      <!-- Iframe Demo -->
      <div class="scenekit-demo relative max-w-5xl mx-auto my-12 rounded-xl overflow-hidden shadow-2xl aspect-video bg-gray-950 border border-gray-700">
        <iframe
          src="https://cognitiveleap.app" 
          frameborder="0"
          allowfullscreen
          class="w-full h-full"
          title="Cognitive Leap Platform Demo"
        ></iframe>
      </div>

      <!-- Features Grid (Original) -->
      <div class="grid md:grid-cols-3 gap-8 mt-16 text-left">
        <div class="feature-card bg-gray-800 p-8 rounded-lg shadow-lg">
          <div class="text-4xl mb-4">🚀</div>
          <h3 class="text-2xl font-bold text-blue-400 mb-2">Индивидуальный темп</h3>
          <p class="text-gray-300">Понял тему? Иди дальше. Застрял? Система вернет на шаг назад. Нельзя "проболеть" важное.</p>
        </div>
        <div class="feature-card bg-gray-800 p-8 rounded-lg shadow-lg">
          <div class="text-4xl mb-4">🧠</div>
          <h3 class="text-2xl font-bold text-blue-400 mb-2">Мотивация "К", не "ОТ"</h3>
          <p class="text-gray-300">Ребенок не боится "двойки", он хочет открыть следующий "уровень". Знания — это награда.</p>
        </div>
        <div class="feature-card bg-gray-800 p-8 rounded-lg shadow-lg">
          <div class="text-4xl mb-4">🧑‍🏫</div>
          <h3 class="text-2xl font-bold text-blue-400 mb-2">Человеческий помощник</h3>
          <p class="text-gray-300">Платформа берет рутину. Тьютор тратит 100% времени на тех, кому действительно нужна помощь.</p>
        </div>
      </div>
    </section>
    
    <!-- 4. ПОЧЕМУ ИГРЫ? (Game Demo) -->
    <section id="why-games" class="py-24 px-4 bg-gray-800">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <!-- Text -->
        <div class="text-left">
          <h2 class="text-3xl md:text-4xl font-extrabold mb-6 text-white">Почему игры?</h2>
          <p class="text-lg text-gray-300 mb-4">Традиционная учеба — это "трение". Мозг сопротивляется скуке.</p>
          <p class="text-lg text-gray-300">Игры — это "дофамин". Они взламывают систему мотивации мозга, заставляя его <strong class="text-green-400">жаждать</strong> решения задач. Мы используем этот механизм, чтобы превратить зубрежку таблицы умножения в увлекательный квест. Это эффективная тренировка для ваших "биологических нейросетей".</p>
        </div>
        
        <!-- Game Demo Thumbnail -->
        <div 
          @click="openGameModal"
          class="game-thumbnail relative rounded-lg overflow-hidden shadow-2xl cursor-pointer group"
        >
          <!-- Admin Edit Button -->
          <button 
            v-if="canEdit"
            @click.stop="triggerFileInput(mathGameThumbInput)" 
            class="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 p-2 rounded-lg text-xs backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
            title="Change Game Thumbnail"
          >
            Edit Thumb
          </button>
          <input v-if="canEdit" type="file" ref="mathGameThumbInput" @change="handleFileChange($event, 'landing-math-game-thumb')" class="hidden" accept="image/*" />

          <!-- Play Button Overlay -->
          <div class="absolute inset-0 bg-black/40 z-10 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="w-20 h-20 bg-white/30 rounded-full flex justify-center items-center backdrop-blur-sm">
              <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
            </div>
          </div>
          
          <!-- Image -->
          <img
            :src="getUrlWithCacheBust('landing-math-game-thumb')"
            alt="Math Radar Game Demo"
            class="w-full h-auto block transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </section>

    <!-- 5. РЕШЕНИЕ СОЦ. "БОЛЕЙ" -->
    <section id="social" class="py-24 px-4 bg-gray-900"> <!-- Back to base bg -->
      <div class="max-w-6xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-12 text-white">Безопасность и друзья. Не "выживание".</h2>
        <div class="grid md:grid-cols-2 gap-8">
          <div class="comparison-card p-8 rounded-lg border-2 border-red-500 bg-red-900/10">
            <div class="text-5xl mb-4">⛓️</div>
            <h3 class="text-xl font-bold text-white mb-2">Традиционная школа</h3>
            <h4 class="text-lg font-semibold text-red-400 mb-4">Социализация "тюремного типа"</h4>
            <p class="text-gray-300">Принудительные классы по 30 "сокамерников". Борьба за статус и буллинг как норма выживания.</p>
          </div>
          <div class="comparison-card p-8 rounded-lg border-2 border-green-500 bg-green-900/10">
            <div class="text-5xl mb-4">🤝</div>
            <h3 class="text-xl font-bold text-white mb-2">Cognitive Leap</h3>
            <h4 class="text-lg font-semibold text-green-400 mb-4">Здоровая социализация</h4>
            <p class="text-gray-300">Малые группы по интересам. Театр, роботы, спорт. Ребенок сам выбирает, с кем ему комфортно. И может уйти.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. "КАМЕРА ХРАНЕНИЯ" -->
    <section id="schedule" class="py-24 px-4 max-w-6xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-extrabold mb-4 text-white">Продуманный день</h2>
      <p class="text-lg text-gray-300 max-w-3xl mx-auto mb-16">Мы понимаем, что вам нужно работать. Мы продумали баланс между "работой мозга" и живым общением.</p>

      <div class="timeline relative max-w-lg mx-auto border-l-2 border-blue-500">
        <!-- Timeline Item 1 -->
        <div class="timeline-item relative mb-12 pl-10">
          <div class="timeline-dot absolute w-5 h-5 bg-blue-500 rounded-full -left-2.5 top-1 border-4 border-gray-900"></div>
          <div class="timeline-content text-left">
            <h3 class="text-xl font-bold text-white">9:00 - 10:30</h3>
            <p class="text-gray-300"><strong>Глубокая работа (Хард-скиллы)</strong><br />Индивидуальная "прокачка" на платформе. Каждый в своем темпе.</p>
          </div>
        </div>
        <!-- Timeline Item 2 -->
        <div class="timeline-item relative mb-12 pl-10">
          <div class="timeline-dot absolute w-5 h-5 bg-blue-500 rounded-full -left-2.5 top-1 border-4 border-gray-900"></div>
          <div class="timeline-content text-left">
            <h3 class="text-xl font-bold text-white">10:30 - 12:00</h3>
            <p class="text-gray-300"><strong>Активность</strong><br />Спорт, прогулка, активные секции. Мозг отдыхает и усваивает.</p>
          </div>
        </div>
        <!-- Timeline Item 3 -->
        <div class="timeline-item relative mb-12 pl-10">
          <div class="timeline-dot absolute w-5 h-5 bg-blue-500 rounded-full -left-2.5 top-1 border-4 border-gray-900"></div>
          <div class="timeline-content text-left">
            <h3 class="text-xl font-bold text-white">13:00 - 14:30</h3>
            <p class="text-gray-300"><strong>Творчество (Софт-скиллы)</strong><br />Групповые проекты: театр, дебаты, музыка, робототехника.</p>
          </div>
        </div>
        <!-- Timeline Item 4 -->
        <div class="timeline-item relative mb-8 pl-10">
          <div class="timeline-dot absolute w-5 h-5 bg-blue-500 rounded-full -left-2.5 top-1 border-4 border-gray-900"></div>
          <div class="timeline-content text-left">
            <h3 class="text-xl font-bold text-white">14:30 - 16:00</h3>
            <p class="text-gray-300"><strong>Консультации</strong><br />Свободная работа или индивидуальная помощь тьютора тем, кто застрял.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. ПРИЗЫВ К ДЕЙСТВИЮ (CTA) -->
    <section id="cta" class="py-24 px-4 bg-gray-800">
      <div class="max-w-6xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-12 text-white">Вашему ребенку не нужен "ремонт".<br />Ему нужна система, созданная для него.</h2>
        <div class="grid md:grid-cols-2 gap-8">
          <!-- B2C Card -->
          <div class="cta-card bg-gray-900 p-10 rounded-lg shadow-lg flex flex-col justify-between text-left">
            <div>
              <h3 class="text-3xl font-bold text-blue-400 mb-4">Для Дома (B2C)</h3>
              <p class="text-gray-300 mb-8 text-lg">Начните заниматься на платформе Cognitive Leap уже сегодня. Дополните текущую школу или перейдите на домашнее обучение.</p>
            </div>
            <a @click.prevent="openGameModal" href="#demo" class="cta-button text-center text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1 cursor-pointer">
              Попробовать Демо-Игру
            </a>
          </div>
          <!-- B2B Card -->
          <div class="cta-card bg-gray-900 p-10 rounded-lg shadow-lg flex flex-col justify-between text-left">
            <div>
              <h3 class="text-3xl font-bold text-blue-400 mb-4">Для Школы (B2B)</h3>
              <p class="text-gray-300 mb-8 text-lg">Мы ищем школы-партнеры. Узнайте, как внедрить систему, или отправьте презентацию директору вашей школы.</p>
            </div>
            <a href="/b2b-directors" class="cta-button text-center text-lg font-semibold text-blue-400 border-2 border-blue-500 hover:bg-blue-500 hover:text-white px-8 py-3 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1">
              Узнать о партнерстве
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>


<style>
/* --- 1. Анимация фраз в "Хуке" --- */
.hero-phrases {
  display: grid;
  grid-template-areas: "stack";
}
.hero-phrases > span {
  grid-area: stack;
  opacity: 0;
  animation: fadeInOut 16s infinite;
}
.hero-phrases > span:nth-child(1) { animation-delay: 0s; }
.hero-phrases > span:nth-child(2) { animation-delay: 4s; }
.hero-phrases > span:nth-child(3) { animation-delay: 8s; }
.hero-phrases > span:nth-child(4) { animation-delay: 12s; }

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(10px); }
  10% { opacity: 1; transform: translateY(0); }
  25% { opacity: 1; transform: translateY(0); }
  35% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 0; }
}

/* --- 2. Анимация стрелки "вниз" --- */
.scroll-prompt .arrow {
  animation: bounce 2s infinite;
}
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

/* --- 3. Анимация "хотспотов" (для iframe-секции, если понадобится) --- */
.hotspot-pulse {
  width: 20px;
  height: 20px;
  background: #3b82f6; /* Tailwind blue-500 */
  border-radius: 50%;
  border: 3px solid white;
  animation: pulse 1.5s infinite;
}
.hotspot-label {
  position: absolute;
  left: 30px;
  top: -5px;
  background: white;
  color: #333; /* Dark text for label */
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease;
  pointer-events: none;
}
.hotspot:hover .hotspot-label {
  opacity: 1;
  transform: translateX(0);
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
</style>
<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
// @ts-ignore
import { useR2Uploader } from '~/composables/useR2Uploader';
// @ts-ignore
import { useModalStore } from '~/composables/useModalStore';
// @ts-ignore
import { useSupabaseClient, useSupabaseUser } from '#imports';

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
const mathGameMaterialId = 'cd7cc20c-1ef4-444d-86cd-d663497bcbfa'; // Тот же ID для демо

// --- Reactive State for B2B Page Assets ---
const pageAssets = reactive<Record<string, { url: string; updated_at: string | null }>>({
  'b2b-hero-bg': { url: 'https://i.imgur.com/33bFvG9.png', updated_at: null }, // Placeholder
  'b2b-dashboard-mockup': { url: 'https://i.imgur.com/L3gqg7a.png', updated_at: null }, // Placeholder for dashboard
  'b2b-math-game-thumb': { url: 'https://i.imgur.com/7bXqR7a.png', updated_at: null } // Placeholder for game thumb
});

// --- Refs for File Inputs ---
const heroBgInput = ref<HTMLInputElement | null>(null);
const dashboardMockupInput = ref<HTMLInputElement | null>(null);
const mathGameThumbInput = ref<HTMLInputElement | null>(null);

// --- Helper function for cache-busting ---
const getUrlWithCacheBust = (key: string) => {
  const asset = pageAssets[key];
  if (!asset) return '';
  if (asset.updated_at) {
    return `${asset.url}?t=${new Date(asset.updated_at).getTime()}`;
  }
  return asset.url;
};

// --- Data Loading ---
onMounted(async () => {
  // 1. Initialize Modal Listeners (for ESC key, etc.)
  modalStore.initializeModalListeners();
  
  // 2. Fetch User Profile (for Admin check)
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

  // 3. Fetch B2B Landing Page Assets (WITH updated_at)
  const assetKeys = Object.keys(pageAssets);
  const { data: assetsData, error: assetsError } = await supabase
    .from('landing_page_assets')
    .select('asset_key, asset_url, updated_at')
    .in('asset_key', assetKeys);

  if (assetsData) {
    for (const asset of assetsData) {
      if (asset.asset_key && asset.asset_url && pageAssets[asset.asset_key]) {
        pageAssets[asset.asset_key].url = asset.asset_url;
        pageAssets[asset.asset_key].updated_at = asset.updated_at;
      }
    }
  }
  if (assetsError) {
    console.error('Error fetching landing page assets:', assetsError);
  }

  // 4. Fetch Math Game Material (for Modal)
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
});

// --- Logic for Image Uploading ---
const triggerFileInput = (inputRef: HTMLInputElement | null) => {
  inputRef?.click();
};

const handleFileChange = async (event: Event, materialId: string) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];

  const publicUrl = await upload(file, materialId);
  
  if (publicUrl) {
    const { data, error: dbError } = await supabase
      .from('landing_page_assets')
      .upsert(
        { asset_key: materialId, asset_url: publicUrl },
        { onConflict: 'asset_key' }
      )
      .select('updated_at')
      .single();
    
    if (dbError) {
      console.error('Failed to save new asset URL to DB:', dbError);
    } else if (data) {
      pageAssets[materialId].url = publicUrl;
      pageAssets[materialId].updated_at = data.updated_at;
    }

  } else {
    console.error('Upload failed:', uploadError.value);
  }
  
  if (target) {
    target.value = '';
  }
};

// --- Logic for Opening Game Modal ---
const openGameModal = () => {
  if (mathGameMaterial.value) {
    modalStore.open('modals/VuePlayerModal', { material: mathGameMaterial.value });
  } else {
    console.error('Cannot open modal: Math game material not loaded.');
  }
};
</script>

<template>
  <main class="text-gray-300 bg-gray-950"> <!-- Darker base for B2B -->

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

    <!-- 1. B2B ХУК (ЗАХВАТ) -->
    <section 
      id="b2b-hook" 
      class="h-screen min-h-[700px] relative flex flex-col justify-center text-white bg-cover bg-center"
      :style="{ backgroundImage: `url(${getUrlWithCacheBust('b2b-hero-bg')})` }"
    >
      <!-- Dark overlay -->
      <div class="absolute inset-0 bg-black/70 z-0"></div>

      <!-- Admin Edit Button -->
      <button 
        v-if="canEdit"
        @click="triggerFileInput(heroBgInput)" 
        class="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 p-2 rounded-lg text-xs backdrop-blur-sm transition-colors"
        title="Change Background Image"
      >
        Edit BG
      </button>
      <input 
        v-if="canEdit"
        type="file" 
        ref="heroBgInput" 
        @change="handleFileChange($event, 'b2b-hero-bg')" 
        class="hidden" 
        accept="image/*" 
      />

      <!-- Content -->
      <div class="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <h1 class="text-4xl md:text-6xl font-extrabold mb-6">
          Что, если бы 90% ваших учеников осваивали программу на "отлично"?
        </h1>
        <p class="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
          Cognitive Leap — это платформа, которая заменяет "уравниловку" на геймификацию и персональные траектории. Снижает выгорание учителей и дает ученикам измеримый результат.
        </p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#b2b-demo-form" class="cta-button text-center text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1">
            Запросить B2B Демо
          </a>
          <a href="#b2b-pdf" class="cta-button text-center text-lg font-semibold text-blue-400 border-2 border-blue-500 hover:bg-blue-500 hover:text-white px-10 py-4 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1">
            Скачать PDF-презентацию
          </a>
        </div>
      </div>
    </section>

    <!-- 2. ПРОБЛЕМА (КРИЗИСЫ) -->
    <section id="b2b-problem" class="py-24 px-4 bg-gray-900">
      <div class="max-w-6xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-16 text-white">
          Три "кризиса", которые съедают ваш бюджет и репутацию
        </h2>
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Crisis Card 1 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">🧑‍🏫</div>
            <h3 class="text-2xl font-bold text-red-400 mb-2">Кризис Кадров</h3>
            <p class="text-gray-300">Талантливые педагоги тратят 80% времени на повторение лекций, дисциплину и проверку тестов. У них не остается сил на главное — индивидуальную работу.</p>
          </div>
          <!-- Crisis Card 2 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">🏭</div>
            <h3 class="text-2xl font-bold text-yellow-400 mb-2">Кризис Вовлеченности</h3>
            <p class="text-gray-300">Сильные ученики скучают. Слабые — не успевают и теряют мотивацию. Родители видят только "средний" результат ("проблема конвейера").</p>
          </div>
          <!-- Crisis Card 3 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">📉</div>
            <h3 class="text-2xl font-bold text-orange-400 mb-2">Кризис Бизнеса</h3>
            <p class="text-gray-300">Онлайн-школы и новые методики забирают учеников. Удерживать и привлекать семьи, используя старые методы, становится дороже с каждым годом.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. РЕШЕНИЕ (OS + MENTORS) -->
    <section id="b2b-solution" class="py-24 px-4 bg-gray-950">
      <div class="max-w-7xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-16 text-white">
          Решение: Cognitive Leap OS
        </h2>
        <div class="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          <!-- Column 1: Platform (Hard Skills) -->
          <div class="text-left">
            <h3 class="text-3xl font-bold text-blue-400 mb-4">Платформа (Hard Skills)</h3>
            <p class="text-lg text-gray-300 mb-6">Наша OS берет на себя 100% рутины: лекции, тесты, отслеживание прогресса. 3D-карта и игровые движки гарантируют вовлеченность и мастерство.</p>
            <div class="scenekit-demo relative max-w-full mx-auto rounded-xl overflow-hidden shadow-2xl aspect-video bg-gray-900 border border-gray-700">
              <iframe
                src="https://cognitiveleap.app" 
                frameborder="0"
                allowfullscreen
                class="w-full h-full"
                title="Cognitive Leap Platform Demo"
              ></iframe>
            </div>
          </div>
          
          <!-- Column 2: Mentors (Soft Skills) -->
          <div class="text-left">
            <h3 class="text-3xl font-bold text-green-400 mb-4">Менторы (Soft Skills)</h3>
            <p class="text-lg text-gray-300 mb-6">Ваши педагоги — элитные наставники. Они ведут проекты, помогают отстающим и видят прогресс каждого ученика на своем дашборде.</p>
            
            <!-- Dashboard Mockup -->
            <div class="dashboard-mockup relative rounded-lg overflow-hidden shadow-2xl border border-gray-700">
              <!-- Admin Edit Button -->
              <button 
                v-if="canEdit"
                @click="triggerFileInput(dashboardMockupInput)" 
                class="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 p-2 rounded-lg text-xs backdrop-blur-sm transition-opacity"
                title="Change Dashboard Mockup"
              >
                Edit Mockup
              </button>
              <input v-if="canEdit" type="file" ref="dashboardMockupInput" @change="handleFileChange($event, 'b2b-dashboard-mockup')" class="hidden" accept="image/*" />
              
              <!-- Image -->
              <img
                :src="getUrlWithCacheBust('b2b-dashboard-mockup')"
                alt="Mentor Dashboard Mockup"
                class="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 4. ВЫГОДЫ (ЛЕЧЕНИЕ) -->
    <section id="b2b-benefits" class="py-24 px-4 bg-gray-900">
      <div class="max-w-6xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-16 text-white">
          Результаты, которые можно измерить
        </h2>
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Benefit Card 1 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">🏆</div>
            <h3 class="text-2xl font-bold text-blue-400 mb-2">Станьте "Школой №1"</h3>
            <p class="text-gray-300">Вы получаете УТП, которое нельзя скопировать. Это ваш главный маркетинговый аргумент для привлечения и удержания семей.</p>
          </div>
          <!-- Benefit Card 2 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">🧘</div>
            <h3 class="text-2xl font-bold text-green-400 mb-2">Счастливые Учителя</h3>
            <p class="text-gray-300">Снижение выгорания и текучки кадров. Вы становитесь "работодателем мечты" для лучших педагогов, так как они занимаются творчеством, а не рутиной.</p>
          </div>
          <!-- Benefit Card 3 -->
          <div class="b2b-card bg-gray-800 p-8 rounded-lg shadow-lg text-left">
            <div class="text-4xl mb-4">📊</div>
            <h3 class="text-2xl font-bold text-yellow-400 mb-2">Прозрачный Прогресс</h3>
            <p class="text-gray-300">Вы (и родители) видите реальный, а не "оценочный", прогресс каждого ученика. Вся школьная программа за 2-3 года.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. ДОКАЗАТЕЛЬСТВО (Game Demo) -->
    <section id="b2b-game-demo" class="py-24 px-4 bg-gray-950">
      <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <!-- Text -->
        <div class="text-left">
          <h2 class="text-3xl md:text-4xl font-extrabold mb-6 text-white">Это не "скучные" онлайн-уроки</h2>
          <p class="text-lg text-gray-300 mb-4">Наши "уроки" — это игровые симуляции. Они используют те же дофаминовые механики, что и популярные игры, для достижения реального мастерства.</p>
          <p class="text-lg text-gray-300">Вот пример: тренажер таблицы умножения, который превращает "зубрежку" в игру на реакцию. Попробуйте сами.</p>
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
          <input v-if="canEdit" type="file" ref="mathGameThumbInput" @change="handleFileChange($event, 'b2b-math-game-thumb')" class="hidden" accept="image/*" />

          <!-- Play Button Overlay -->
          <div class="absolute inset-0 bg-black/40 z-10 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="w-20 h-20 bg-white/30 rounded-full flex justify-center items-center backdrop-blur-sm">
              <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
            </div>
          </div>
          
          <!-- Image -->
          <img
            :src="getUrlWithCacheBust('b2b-math-game-thumb')"
            alt="Math Radar Game Demo"
            class="w-full h-auto block transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </section>

    <!-- 6. ФИНАЛЬНЫЙ CTA (Форма) -->
    <section id="b2b-demo-form" class="py-24 px-4 bg-gray-900">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-6 text-white">Готовы стать школой будущего?</h2>
        <p class="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
          Давайте за 15 минут покажем, как Cognitive Leap интегрируется в вашу школу и какие результаты вы получите в первый же год.
        </p>
        
        <!-- Form Placeholder -->
        <form class="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-lg mx-auto text-left space-y-6">
          <div>
            <label for="b2b-name" class="block text-sm font-medium text-gray-300 mb-1">Ваше Имя</label>
            <input type="text" id="b2b-name" class="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="Иван Петров">
          </div>
          <div>
            <label for="b2b-school" class="block text-sm font-medium text-gray-300 mb-1">Название Школы</label>
            <input type="text" id="b2b-school" class="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="Частная школа 'Вектор'">
          </div>
          <div>
            <label for="b2b-phone" class="block text-sm font-medium text-gray-300 mb-1">Телефон</label>
            <input type="tel" id="b2b-phone" class="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="+7 (999) 123-45-67">
          </div>
          <div>
            <button type="submit" class="w-full cta-button text-center text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-lg transition duration-200 ease-in-out transform hover:-translate-y-1">
              Забронировать Демо-звонок
            </button>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<style>
/* 
  Мы используем 'details'/'summary' для FAQ. 
  Эти стили убирают маркер по умолчанию и делают плавный 'open'.
  Tailwind пока не умеет это из коробки (кроме 'group-open:').
*/
details > summary {
  list-style: none;
}
details > summary::-webkit-details-marker {
  display: none;
}
</style>
<template>
  <div class="program-page-wrapper">
    <ClientOnly v-if="skinId && programId">
      <SceneKit
        :skin-id="skinId"
        :program-id="programId"
        :is-active="true"
      />
      <template #fallback>
        <div class="loading-placeholder">Loading Program...</div>
      </template>
    </ClientOnly>
    <div v-else-if="error" class="error-placeholder">{{ error }}</div>
    <div v-else class="loading-placeholder">Loading...</div>

    <ModalWrapper />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import SceneKit from '~/components/SceneKit.client.vue';
import ModalWrapper from '~/components/ModalWrapper.vue'; // It's good practice to import it

const route = useRoute();
const supabase = useSupabaseClient();

const programId = ref(null);
const skinId = ref(null);
const error = ref(null);

onMounted(async () => {
  const currentProgramId = route.params.id;
  if (!currentProgramId) {
    error.value = "Program ID is missing.";
    return;
  }
  
  programId.value = currentProgramId;

  try {
    const { data, error: fetchError } = await supabase
      .from('programs')
      .select('skin_id')
      .eq('id', currentProgramId)
      .single();

    if (fetchError || !data) throw new Error("Program not found or you don't have access.");
    if (!data.skin_id) throw new Error("This program does not have an assigned skin.");
    
    skinId.value = data.skin_id;

  } catch (e) {
    console.error(e);
    error.value = e.message;
  }
});
</script>

<style scoped>
.program-page-wrapper, .loading-placeholder, .error-placeholder {
  width: 100%;
  height: 100vh; /* Use vh for full viewport height */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #111;
  color: #fff;
  position: relative; /* Ensure it's a positioning context */
}
.error-placeholder {
  color: #ef4444;
}
</style>
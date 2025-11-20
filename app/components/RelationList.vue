<template>
  <div class="pt-6 space-y-4">
    <div v-for="relation in relations" :key="relation.id" class="relation-card">
      <div>
        <p class="relation-name">{{ getOtherPartyName(relation) }}</p>
        <p class="relation-type">{{ relation.relation_type }}</p>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="relation.status === 'pending'">
          <template v-if="user && user.email === relation.invitee_email">
            <button @click="$emit('accept', relation)" class="p-2 text-gray-400 hover:text-green-500" :title="$t('accept')" aria-label="Accept Invitation">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </button>
            <button @click="$emit('delete', relation)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('reject')" aria-label="Reject Invitation">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </template>
          <template v-else>
            <span class="text-sm text-yellow-400" :title="$t('pending')">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </span>
            <button @click="$emit('delete', relation)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_cancelInvitation')" aria-label="Cancel Invitation">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </template>
        </template>
        <template v-else-if="relation.status === 'active'">
          <span class="text-sm text-green-400" :title="$t('active')">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </span>
          <button @click="$emit('delete', relation)" class="p-2 text-gray-400 hover:text-red-500" :title="$t('profile_deleteConnection')" aria-label="Delete Connection">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </template>
      </div>
    </div>
    <button @click="$emit('add')" class="w-full bg-transparent border border-dashed border-[#4b5563] text-[#9ca3af] py-2 px-4 rounded-lg font-semibold transition-colors cursor-pointer hover:bg-[#374151] hover:text-white">
      + {{ buttonText }}
    </button>
  </div>
</template>

<script setup>
import { useSupabaseUser } from '#imports';
import { useI18n } from 'vue-i18n';

// --- COMPOSABLES ---
const user = useSupabaseUser();
const { t } = useI18n();

// --- PROPS & EMITS ---
defineProps({
  relations: {
    type: Array,
    required: true,
  },
  buttonText: {
    type: String,
    required: true,
  }
});
defineEmits(['accept', 'delete', 'add']);

// --- LOGIC ---
const getOtherPartyName = (relation) => {
  if (!user.value) return t('unknown_user');
  
  if (relation.status === 'pending' && relation.invitee_email === user.value.email) {
    return relation.student?.full_name || relation.curator?.full_name || t('unknown_user');
  }
  
  if (relation.student_id === user.value.id) {
    return relation.curator?.full_name || relation.invitee_email || t('unknown_user');
  }

  if (relation.curator_id === user.value.id) {
    return relation.student?.full_name || relation.invitee_email || t('unknown_user');
  }

  return t('unknown_user');
};
</script>

<style scoped>
.relation-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.relation-name {
  font-weight: 700;
  color: var(--text-primary);
}

.relation-type {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

:global(.light-theme) .relation-card {
  background-color: #f9fafb;
  border-color: #d1d5db;
}
</style>
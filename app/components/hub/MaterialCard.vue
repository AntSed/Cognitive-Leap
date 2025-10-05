<template>
  <div class="material-card" :class="`status-${material.status}`">
    <div class="card-header">
      <span class="material-type">{{ material.material_type || 'N/A' }}</span>
      <span class="material-status">{{ material.status }}</span>
    </div>
    <div class="card-body">
      <h3 class="material-title">
        {{ material.title_translations?.en || 'Untitled' }}
      </h3>
      <p v-if="material.description_translations?.en" class="material-description">
        {{ material.description_translations.en.substring(0, 100) }}...
      </p>
    </div>
    <div class="card-footer">
      <span class="material-age">
        Ages: {{ material.recommended_age_min || '?' }} - {{ material.recommended_age_max || '?' }}
      </span>
    </div>
  </div>
</template>

<script setup>
// This component receives a single 'material' object as a prop.
defineProps({
  material: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.material-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  border-left: 5px solid #bdc3c7; /* Default border color */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.material-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Status-specific border colors */
.material-card.status-published { border-color: #2ecc71; } /* green */
.material-card.status-in_review { border-color: #f1c40f; } /* yellow */
.material-card.status-draft { border-color: #95a5a6; }     /* gray */
.material-card.status-rejected { border-color: #e74c3c; }  /* red */


.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.material-type {
  background-color: #ecf0f1;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: bold;
}

.material-status {
  font-style: italic;
}

.card-body {
  flex-grow: 1;
}

.material-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #2c3e50;
}

.material-description {
  font-size: 0.9rem;
  color: #34495e;
  line-height: 1.4;
}

.card-footer {
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #ecf0f1;
  font-size: 0.8rem;
  color: #7f8c8d;
}
</style>
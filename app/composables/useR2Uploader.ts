// app/composables/useR2Uploader.ts
import { ref } from 'vue'
import imageCompression from 'browser-image-compression'

export function useR2Uploader() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const upload = async (file: File, materialId: string): Promise<string | null> => {
    isLoading.value = true
    error.value = null

    try {
      // 1. Image compression.
      const options = {
        maxSizeMB: 0.2, // 200KB
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp', // Force output to WebP.
      }
      const compressedFile = await imageCompression(file, options)

      // 2. Get a pre-signed URL from our server.
      const { uploadUrl, publicUrl } = await $fetch('/api/upload-prepare', {
        method: 'POST',
        body: {
          materialId,
          contentType: compressedFile.type,
        },
      })

      // 3. Upload the file DIRECTLY to R2.
      await $fetch(uploadUrl, {
        method: 'PUT',
        body: compressedFile,
        headers: {
          'Content-Type': compressedFile.type,
        },
      })

      // 4. Success! Return the public URL for database storage.
      return publicUrl

    } catch (e: any) {
      console.error(e)
      error.value = e.data?.message || e.message || 'Upload failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { upload, isLoading, error: error } // Return `error` as a ref.
}
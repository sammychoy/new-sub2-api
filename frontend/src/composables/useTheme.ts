import { ref } from 'vue'

const isDark = ref(
  typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    : false
)

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    }
  }

  function initTheme() {
    if (typeof document === 'undefined') return
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      isDark.value = true
      document.documentElement.classList.add('dark')
    } else if (saved === 'light') {
      isDark.value = false
      document.documentElement.classList.remove('dark')
    }
  }

  return {
    isDark,
    toggleTheme,
    initTheme
  }
}

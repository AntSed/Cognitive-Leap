// app/composables/useTheme.js
export const useTheme = () => {
    const theme = useState('theme', () => 'dark');
    const isClient = process.client;

    // Initialize theme on client
    const initTheme = () => {
        if (!isClient) return;

        // Check localStorage first
        const savedTheme = localStorage.getItem('cognitive-leap-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            theme.value = savedTheme;
        } else {
            // Detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme.value = prefersDark ? 'dark' : 'light';
        }

        // Apply theme class to HTML
        applyThemeClass(theme.value);
    };

    const applyThemeClass = (newTheme) => {
        if (!isClient) return;

        if (newTheme === 'light') {
            document.documentElement.classList.add('light-theme');
        } else {
            document.documentElement.classList.remove('light-theme');
        }
    };

    const toggleTheme = () => {
        const newTheme = theme.value === 'dark' ? 'light' : 'dark';
        theme.value = newTheme;

        if (isClient) {
            localStorage.setItem('cognitive-leap-theme', newTheme);
            applyThemeClass(newTheme);
        }
    };

    const setTheme = (newTheme) => {
        if (newTheme !== 'dark' && newTheme !== 'light') return;

        theme.value = newTheme;

        if (isClient) {
            localStorage.setItem('cognitive-leap-theme', newTheme);
            applyThemeClass(newTheme);
        }
    };

    return {
        theme: readonly(theme),
        toggleTheme,
        setTheme,
        initTheme
    };
};

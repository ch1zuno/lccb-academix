/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0f2942',
        'ink-soft': '#5b5a52',
        line: '#d4cbbb',
        stone: '#f2ede1',
        paper: '#fffdf6',
        gold: '#d4ac0d',
        'gold-ink': '#6b5200',
        charcoal: '#0f2942',
        primary: {
          DEFAULT: '#0f2942',
          foreground: '#fff9e9',
        },
        secondary: {
          DEFAULT: '#d4ac0d',
          foreground: '#0f2942',
        },
        destructive: {
          DEFAULT: '#b43122',
          foreground: '#fff9ee',
        },
        muted: {
          DEFAULT: '#e9e1d1',
          foreground: '#5b5a52',
        },
        border: '#d4cbbb',
        input: '#0f2942',
        ring: '#d4ac0d',
        background: '#f2ede1',
        foreground: '#0f2942',
        card: {
          DEFAULT: '#fffdf6',
          foreground: '#0f2942',
        },
      },
      borderRadius: {
        lg: '0px',
        md: '0px',
        sm: '0px',
      },
    },
  },
  plugins: [],
}

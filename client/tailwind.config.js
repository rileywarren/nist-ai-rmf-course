/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0071bc',
        primaryDark: '#003366',
        accent: '#02bfe7',
        success: '#2e8540',
        warning: '#fdb81e',
        error: '#e31c3d',
      },
    },
  },
  plugins: [],
};

// Apply the saved theme before first paint, so dark mode doesn't flash white on load. A file of its own because the desktop app's content policy refuses inline scripts.
try {
  var t = localStorage.getItem('voice-todo.theme') || 'system';
  if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}

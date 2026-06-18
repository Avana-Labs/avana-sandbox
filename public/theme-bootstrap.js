(() => {
  const storageKey = "avana-theme"
  const root = document.documentElement
  const storedTheme = window.localStorage.getItem(storageKey)
  const theme =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system"
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  const resolvedTheme = theme === "system" ? systemTheme : theme
  root.classList.toggle("dark", resolvedTheme === "dark")
  root.style.colorScheme = resolvedTheme
})()

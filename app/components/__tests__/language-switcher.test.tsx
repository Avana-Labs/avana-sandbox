import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { LanguageSwitcher } from "@/app/components/language-switcher"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"

afterEach(() => cleanup())

function renderSwitcher(props: Parameters<typeof LanguageSwitcher>[0] = {}) {
  return render(
    <DisplayPreferencesProvider>
      <LanguageSwitcher {...props} />
    </DisplayPreferencesProvider>,
  )
}

describe("LanguageSwitcher", () => {
  it("keeps the language pill at a >=40px tap target", () => {
    renderSwitcher()

    const trigger = screen.getByRole("button", { name: /change language/i })
    // h-10 == 2.5rem == 40px keeps the "EN" pill above the mobile tap-target floor.
    expect(trigger.className).toContain("h-10")
  })
})

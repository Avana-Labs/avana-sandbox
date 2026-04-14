import { PageIntro } from "../components/page-intro"

export default function PluginsPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PageIntro
            title="Plugins"
            description="Enhance your Figma workflow with automation tools, design helpers, and productivity plugins."
          />
        </div>
      </main>
    </div>
  )
}

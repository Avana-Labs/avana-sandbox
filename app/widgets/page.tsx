import { PageIntro } from "../components/page-intro"

export default function WidgetsPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <PageIntro
            title="Widgets"
            description="Discover interactive widgets to enhance your Figma designs—from data visualization to prototyping tools."
          />
        </div>
      </main>
    </div>
  )
}

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
          {/* Background accent */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              Ready to transform your forum?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Get started in minutes with our simple integration. No credit card required for the free tier.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

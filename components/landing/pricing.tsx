import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small communities getting started with voice features.",
    features: [
      "Up to 5 participants per room",
      "720p screen sharing",
      "Basic audio quality",
      "1 concurrent room",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For growing forums that need more capacity and quality.",
    features: [
      "Up to 10 participants per room",
      "4K screen sharing",
      "HD audio with noise suppression",
      "10 concurrent rooms",
      "Forum integration API",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large-scale deployments with advanced requirements.",
    features: [
      "Unlimited participants",
      "4K screen sharing",
      "Studio-quality audio",
      "Unlimited concurrent rooms",
      "Self-hosted option",
      "SLA guarantee",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-card/30 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Choose the plan that fits your community size. Scale up as you grow.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative flex flex-col rounded-2xl border p-6 lg:p-8 ${
                tier.popular
                  ? "border-accent bg-card"
                  : "border-border bg-card/50"
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                  Most Popular
                </Badge>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={tier.popular ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Usage-based note */}
        <div className="mt-12 rounded-xl border border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include fair usage limits. Additional minutes available at{" "}
            <span className="font-medium text-foreground">$0.004/minute</span> per participant.
            Self-hosting eliminates per-minute costs entirely.
          </p>
        </div>
      </div>
    </section>
  )
}

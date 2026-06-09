import { Link } from 'react-router-dom';
import {
  Droplets,
  Pill,
  ShoppingBag,
  Stethoscope,
  Sun,
  ScanLine,
  UtensilsCrossed,
  Ban,
  Clock,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  buildSkinCareAdvice,
  pharmacySearchFromConcern,
  type SkinCareAdvice,
} from '@/lib/skinCareAdvice';
import type { ScanReport } from '@/types/mediscan';

interface SkinCareResultPanelProps {
  report: ScanReport;
  onBookDermatologist?: () => void;
}

function severityVariant(severity: SkinCareAdvice['severity']) {
  if (severity === 'urgent') return 'danger' as const;
  if (severity === 'moderate') return 'warning' as const;
  return 'success' as const;
}

const SKIN_FOOD_FALLBACK =
  'These eat/avoid tips are for your skin only (self-care). They are NOT added to your BP, sugar, or wellness diet plan.';

export function SkinCareResultPanel({ report, onBookDermatologist }: SkinCareResultPanelProps) {
  const advice =
    report.skinCareAdvice ??
    buildSkinCareAdvice(report.prediction, report.confidence, report.probabilities);

  if (!advice) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm text-muted">
        Skin analysis is processing. Re-open this report in a moment for your full face wash routine.
      </div>
    );
  }

  const pharmacyQuery = pharmacySearchFromConcern(advice.concernKey);
  const pharmacyUrl = `/pharmacy?search=${encodeURIComponent(pharmacyQuery)}`;

  const findings = advice.scanFindings ?? [];
  const routine = advice.dailyRoutine ?? [];
  const foodsEat = advice.foodsToEat ?? [];
  const foodsAvoid = advice.foodsToAvoid ?? [];
  const foodDisclaimer = advice.skinFoodDisclaimer || SKIN_FOOD_FALLBACK;

  return (
    <div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-primary/5 p-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Your detailed skin report</p>
          <h3 className="text-xl font-bold mt-1">{advice.primaryConcern}</h3>
          <p className="text-sm text-muted mt-2 leading-relaxed">{advice.summary}</p>
          {report.confidence != null && (
            <p className="text-xs text-muted mt-1">Scan confidence: {Math.round(report.confidence)}%</p>
          )}
        </div>
        <Badge variant={severityVariant(advice.severity)} className="capitalize shrink-0">
          {advice.severity === 'urgent' ? 'See doctor soon' : advice.severity}
        </Badge>
      </div>

      {findings.length > 0 && (
        <div className="rounded-lg border border-violet-200/60 bg-violet-50/50 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ScanLine className="h-4 w-4 text-violet-600" />
            What we detected — minute details
          </p>
          <ul className="space-y-2">
            {findings.map((item) => (
              <li key={item} className="text-sm flex gap-2 leading-relaxed">
                <span className="text-violet-600 shrink-0 font-bold">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Droplets className="h-4 w-4 text-primary" />
          What your skin needs right now
        </p>
        <ul className="space-y-2">
          {advice.whatYourSkinNeeds.map((item) => (
            <li key={item} className="text-sm flex gap-2">
              <span className="text-primary shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {routine.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold">Your prescribed face wash routine (step-by-step)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {routine.map((block) => (
              <div
                key={block.period}
                className="rounded-lg border-2 border-primary/20 bg-background p-4"
              >
                <p className="text-sm font-bold flex items-center gap-2 mb-3 capitalize text-primary">
                  <Clock className="h-4 w-4" />
                  {block.period} — face wash & care
                </p>
                <ol className="space-y-2.5 list-none">
                  {block.steps.map((step, i) => (
                    <li key={step} className="text-sm text-muted leading-relaxed flex gap-2">
                      <span className="font-bold text-foreground shrink-0">{i + 1}.</span>
                      <span>{step.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {advice.suggestedMedicines.length > 0 && (
        <div>
          <p className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Pill className="h-4 w-4 text-primary" />
            Prescribed products — face wash, serums, creams (OTC guidance)
          </p>
          <p className="text-xs text-muted mb-3">
            Use exactly as written below. Confirm with a dermatologist for prescription-strength items.
          </p>
          <div className="grid gap-3">
            {advice.suggestedMedicines.map((med, index) => (
              <div
                key={med.name}
                className="rounded-lg border border-border bg-background p-4 text-sm space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-base">
                    {index + 1}. {med.name}
                  </p>
                  <Badge variant="secondary" className="text-xs">{med.form}</Badge>
                </div>
                <p className="text-muted">
                  <span className="font-semibold text-foreground">Why: </span>
                  {med.purpose}
                </p>
                <div className="grid sm:grid-cols-2 gap-2 pt-1 rounded-md bg-muted/30 p-2">
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">How to use: </span>
                    {med.howToUse}
                  </p>
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">When: </span>
                    {med.whenToUse}
                  </p>
                </div>
                <p className="text-xs text-amber-800/90 bg-amber-50 rounded px-2 py-1">
                  <span className="font-semibold">Caution: </span>
                  {med.caution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(foodsEat.length > 0 || foodsAvoid.length > 0) && (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 flex gap-2 text-sm text-blue-900">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{foodDisclaimer}</p>
          </div>
          <p className="text-sm font-bold">Self-care food guide (skin only — not your Vitals diet plan)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {foodsEat.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold flex items-center gap-2 mb-3 text-emerald-900">
                  <UtensilsCrossed className="h-4 w-4" />
                  Foods to eat for clearer skin
                </p>
                <ul className="space-y-1.5">
                  {foodsEat.map((item) => (
                    <li key={item} className="text-sm text-emerald-900 flex gap-2">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {foodsAvoid.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
                <p className="text-sm font-semibold flex items-center gap-2 mb-3 text-red-900">
                  <Ban className="h-4 w-4" />
                  Foods to avoid for your skin
                </p>
                <ul className="space-y-1.5">
                  {foodsAvoid.map((item) => (
                    <li key={item} className="text-sm text-red-900 flex gap-2">
                      <span className="text-red-600 shrink-0">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {advice.lifestyleTips.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Daily habits</p>
          <div className="flex flex-wrap gap-2">
            {advice.lifestyleTips.map((tip) => (
              <span
                key={tip}
                className="text-xs px-2.5 py-1 rounded-full bg-background border border-border"
              >
                <Sun className="inline h-3 w-3 mr-1 text-amber-500" />
                {tip}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Link to={pharmacyUrl}>
          <Button variant="secondary" size="sm" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Shop face wash & products
          </Button>
        </Link>
        {onBookDermatologist && (
          <Button size="sm" className="gap-2" onClick={onBookDermatologist}>
            <Stethoscope className="h-4 w-4" />
            Book dermatologist
          </Button>
        )}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        This is detailed educational guidance from your AI skin scan — not a replacement for a dermatologist.
        Face wash and food tips here are for you to follow yourself; they are not merged into your BP/sugar meal
        plan. Confirm diagnosis and prescription products with a doctor for persistent acne, pigmentation,
        eczema, or any changing mole.
      </p>
    </div>
  );
}

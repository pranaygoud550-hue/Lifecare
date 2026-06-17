import { useState } from 'react';
import { toast } from 'react-toastify';
import { Shield, FileText } from 'lucide-react';
import { useAcknowledgeHospitalLegalMutation, useGetHospitalProfileQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LegalCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-input"
      />
      <span>{children}</span>
    </label>
  );
}

export function HospitalLegalAcknowledgmentPage() {
  const { data, refetch } = useGetHospitalProfileQuery();
  const [submit, { isLoading }] = useAcknowledgeHospitalLegalMutation();

  const profile = data?.data;
  const defaults = profile?.hospitalAdminDetails;

  const [acknowledgedBy, setAcknowledgedBy] = useState(
    defaults?.legalAcknowledgedBy ||
      `${profile?.profile?.firstName ?? ''} ${profile?.profile?.lastName ?? ''}`.trim()
  );
  const [bloodBankLicenseNumber, setBloodBankLicenseNumber] = useState(
    defaults?.bloodBankLicenseNumber ?? ''
  );
  const [hospitalAuthorizationId, setHospitalAuthorizationId] = useState(
    defaults?.hospitalAuthorizationId ?? ''
  );
  const [checks, setChecks] = useState({
    authorized: false,
    genuineNeed: false,
    donorScreening: false,
    dataProtection: false,
    acceptTerms: false,
  });

  const allChecked = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecked) {
      toast.error('Please accept all security and legal confirmations');
      return;
    }
    try {
      await submit({
        acknowledgedBy,
        bloodBankLicenseNumber,
        hospitalAuthorizationId: hospitalAuthorizationId || undefined,
        acceptTerms: true,
        confirmAuthorized: true,
        confirmGenuineNeed: true,
        confirmDonorScreening: true,
        confirmDataProtection: true,
      }).unwrap();
      toast.success('Legal acknowledgment recorded — you can now send blood alerts');
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : 'Could not save acknowledgment';
      toast.error(msg || 'Could not save acknowledgment');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-red-600" />
          Hospital security & legal acknowledgment
        </h1>
        <p className="text-muted text-sm mt-2">
          Before sending blood emergency alerts, your hospital must confirm authorization, license
          details, and donor safety obligations.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Required confirmations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 list-disc pl-5 text-amber-950/90">
            {(profile?.legalSummary ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hospital authorization details
          </CardTitle>
          <CardDescription>
            Provided by your platform administrator when your account was created. Confirm or update
            below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="officer">Authorized officer name</Label>
              <Input
                id="officer"
                value={acknowledgedBy}
                onChange={(e) => setAcknowledgedBy(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="license">Blood bank license number</Label>
              <Input
                id="license"
                value={bloodBankLicenseNumber}
                onChange={(e) => setBloodBankLicenseNumber(e.target.value)}
                placeholder="State / hospital blood bank license"
                required
              />
            </div>
            <div>
              <Label htmlFor="authId">Hospital authorization ID (optional)</Label>
              <Input
                id="authId"
                value={hospitalAuthorizationId}
                onChange={(e) => setHospitalAuthorizationId(e.target.value)}
                placeholder="NABH / registration reference"
              />
            </div>

            <div className="space-y-3 border rounded-xl p-4 bg-muted/30">
              <LegalCheckbox
                id="authorized"
                checked={checks.authorized}
                onChange={(v) => setChecks((c) => ({ ...c, authorized: v }))}
              >
                I am authorized by this hospital to request voluntary blood donors via LifeCare+.
              </LegalCheckbox>
              <LegalCheckbox
                id="genuine"
                checked={checks.genuineNeed}
                onChange={(v) => setChecks((c) => ({ ...c, genuineNeed: v }))}
              >
                I will only send alerts for genuine emergency or critical blood needs verified by our
                clinical team.
              </LegalCheckbox>
              <LegalCheckbox
                id="screening"
                checked={checks.donorScreening}
                onChange={(v) => setChecks((c) => ({ ...c, donorScreening: v }))}
              >
                All donors will be screened at our hospital blood bank per applicable national
                guidelines before donation.
              </LegalCheckbox>
              <LegalCheckbox
                id="data"
                checked={checks.dataProtection}
                onChange={(v) => setChecks((c) => ({ ...c, dataProtection: v }))}
              >
                I will protect donor contact data and not use it for marketing or unrelated purposes.
              </LegalCheckbox>
              <LegalCheckbox
                id="terms"
                checked={checks.acceptTerms}
                onChange={(v) => setChecks((c) => ({ ...c, acceptTerms: v }))}
              >
                I have read and accept the LifeCare+ hospital blood coordination terms (version{' '}
                {profile?.legalTermsVersion ?? 'current'}).
              </LegalCheckbox>
            </div>

            {profile?.legalFullText && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-medium text-foreground">
                  Read full legal text
                </summary>
                <pre className="mt-3 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-muted/40 border">
                  {profile.legalFullText}
                </pre>
              </details>
            )}

            <Button
              type="submit"
              disabled={isLoading || !allChecked}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Saving…' : 'Submit legal acknowledgment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

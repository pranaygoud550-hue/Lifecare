import { LifeBuoy } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { dispatchNeedHelp } from '@/lib/needHelp';
import { Button } from '@/components/ui/button';

export function EmergencyButton() {
  const dispatch = useAppDispatch();

  return (
    <Button
      type="button"
      variant="danger"
      className="gap-2"
      onClick={() => dispatchNeedHelp(dispatch)}
    >
      <LifeBuoy className="h-5 w-5" />
      Need Help
    </Button>
  );
}

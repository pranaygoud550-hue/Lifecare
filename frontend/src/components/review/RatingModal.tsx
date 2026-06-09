import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRateAppointmentMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RatingModalProps {
  appointmentId: string;
  doctorName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RatingModal({ appointmentId, doctorName, onClose, onSuccess }: RatingModalProps) {
  const [score, setScore] = useState(5);
  const [review, setReview] = useState('');
  const [rateAppointment, { isLoading }] = useRateAppointmentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rateAppointment({ id: appointmentId, score, review }).unwrap();
      toast.success('Thank you for your review!');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Failed to submit review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Rate Dr. {doctorName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScore(s)}
                    className="p-1"
                  >
                    <Star
                      className={cn('h-8 w-8', s <= score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review">Review (optional)</Label>
              <Input
                id="review"
                placeholder="Share your experience..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

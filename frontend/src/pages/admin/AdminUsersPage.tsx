import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGetAdminUsersQuery, useVerifyUserMutation, useBlockUserMutation } from '@/features/api/apiSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { User } from '@/types';

export function AdminUsersPage() {
  const [userType, setUserType] = useState('');
  const { data, refetch } = useGetAdminUsersQuery({ userType: userType || undefined, page: '1' });
  const [verifyUser] = useVerifyUserMutation();
  const [blockUser] = useBlockUserMutation();

  const users = data?.data?.users || [];

  const handleVerify = async (id: string) => {
    try {
      await verifyUser(id).unwrap();
      toast.success('User verified');
      refetch();
    } catch {
      toast.error('Verification failed');
    }
  };

  const handleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await blockUser({ id, isBlocked }).unwrap();
      toast.success(isBlocked ? 'User blocked' : 'User unblocked');
      refetch();
    } catch {
      toast.error('Action failed');
    }
  };

  const isVerified = (user: User) => {
    if (user.userType === 'doctor') return user.doctorDetails?.verified;
    if (user.userType === 'pharmacy') return user.pharmacyDetails?.verified;
    return true;
  };

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-2">User Management</h1>
      <p className="text-muted mb-8">Verify, manage, and monitor platform users</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'patient', 'doctor', 'pharmacy', 'ambulance', 'hospital_admin'].map((type) => (
          <Button
            key={type || 'all'}
            variant={userType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUserType(type)}
            className="capitalize"
          >
            {type || 'All Users'}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user._id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{getInitials(user.profile.firstName, user.profile.lastName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{user.profile.firstName} {user.profile.lastName}</h3>
                  <Badge variant="outline" className="capitalize">{user.userType}</Badge>
                  {isVerified(user) ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                  {user.isBlocked && <Badge variant="danger">Blocked</Badge>}
                </div>
                <p className="text-sm text-muted">{user.email} • {user.phone}</p>
              </div>
              <div className="flex gap-2">
                {!isVerified(user) && (user.userType === 'doctor' || user.userType === 'pharmacy') && (
                  <Button size="sm" variant="secondary" onClick={() => handleVerify(user._id)}>Verify</Button>
                )}
                <Button
                  size="sm"
                  variant={user.isBlocked ? 'outline' : 'danger'}
                  onClick={() => handleBlock(user._id, !user.isBlocked)}
                >
                  {user.isBlocked ? 'Unblock' : 'Block'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

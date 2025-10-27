'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { LogOut, User } from 'lucide-react';

export function UserButton() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const handleSignOut = () => {
    signOut({
      callbackUrl: '/login',
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{session.user.name || session.user.email}</span>
      </div>
      <Button
        onClick={handleSignOut}
        variant="tertiary"
        size="sm"
        icon={<LogOut className="h-4 w-4" />}
      >
        Logout
      </Button>
    </div>
  );
}

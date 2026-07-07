import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useAuth } from './useAuth';

export function useSocket(event: string, callback: (data: any) => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [event, callback, user]);

  return getSocket();
}

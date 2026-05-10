import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let s = null;
    if (token && user) {
      s = connectSocket(token);
      setSocket(s);
    } else {
      setSocket(null);
    }
    return () => {
      if (s) s.disconnect();
    };
  }, [token, user]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { chatApi } from '../api/services';

const useActiveSession = () => {
  const { astrologer, isLoggedIn } = useSelector((s) => s.auth);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !astrologer) {
      setActiveSession(null);
      return;
    }

    const checkActive = async () => {
      try {
        const res = await chatApi.getActiveSession({ astrologerId: astrologer?.id });
        const d = res.data;
        if (d?.activeChat) {
          setActiveSession({
            type: 'chat',
            id: d.activeChat.id,
            name: d.activeChat.userName,
            status: d.activeChat.chatStatus,
          });
        } else if (d?.activeCall) {
          setActiveSession({
            type: 'call',
            id: d.activeCall.id,
            name: d.activeCall.userName,
            status: d.activeCall.callStatus,
          });
        } else {
          setActiveSession(null);
        }
      } catch (e) {
        setActiveSession(null);
      }
    };

    checkActive();
    const interval = setInterval(checkActive, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, astrologer]);

  return activeSession;
};

export default useActiveSession;

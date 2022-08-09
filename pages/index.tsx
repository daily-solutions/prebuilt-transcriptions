import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import DailyIframe from '@daily-co/daily-js';

const CAPTIONS = {
  iconPath: `${process.env.NEXT_PUBLIC_BASE_URL}/subtitles.svg`,
  label: 'Captions',
  tooltip: 'Turn captions on',
};

const STOP_CAPTIONS = {
  iconPath: `${process.env.NEXT_PUBLIC_BASE_URL}/subtitles.svg`,
  label: 'Stop CC',
  tooltip: 'Turn captions off',
};

const CALL_OPTIONS = {
  showLeaveButton: true,
  iframeStyle: {
    position: 'fixed',
    border: '0',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
  },
  customTrayButtons: {
    captions: CAPTIONS,
  }
};

const Index = () => {
  const ref = useRef(null);
  const [callFrame, setCallFrame] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [captions, setCaptions] = useState([]);

  const url = `https://${process.env.NEXT_PUBLIC_DAILY_DOMAIN}.daily.co/${process.env.NEXT_PUBLIC_DAILY_ROOM}`;

  const handleCustomButtonClick = useCallback(async (event) => {
    if (event.button_id === 'captions') {
      if (isTranscribing) {
        await callFrame.stopTranscription();
        await callFrame.updateCustomTrayButtons({ captions: CAPTIONS });
        return;
      }
      await callFrame.startTranscription();
      await callFrame.updateCustomTrayButtons({ captions: STOP_CAPTIONS });
    }
  }, [callFrame, isTranscribing]);

  const handleNewMessage = useCallback(
    (e) => {
      if (e.fromId === 'transcription' && e.data?.is_final) {
        setIsTranscribing(true);

        const participants = callFrame.participants();
        const name =
          participants.local.session_id === e.data.session_id
            ? participants.local.user_name
            : participants[e.data.session_id].user_name;
        setCaptions(captions =>
          [...captions, `${name}: ${e.data.text}`]
        );
      }
    },
    [callFrame]
  );

  const handleTranscriptionStarted = useCallback(() => {
    console.log('💬 Transcription started');
    setIsTranscribing(true);
  }, []);

  const handleTranscriptionStopped = useCallback(() => {
    console.log('💬 Transcription stopped');
    setIsTranscribing(false);
  }, []);

  const handleTranscriptionError = useCallback(() => {
    console.log('❗ Transcription error!');
    setIsTranscribing(false);
  }, []);

  const joinCall = useCallback(async () => {
    const newCallFrame = DailyIframe.createFrame(
      ref?.current,
      CALL_OPTIONS,
    );
    setCallFrame(newCallFrame);

    const res = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName: process.env.NEXT_PUBLIC_DAILY_ROOM,
        isOwner: true,
      })
    });
    const resJson = await res.json();

    await newCallFrame.join({ url, token: resJson.token });
  }, [url]);

  useEffect(() => {
    if (!callFrame) return;

    const leaveCall = () => {
      callFrame.destroy();
      setCallFrame(null);
    };

    callFrame.on('left-meeting', leaveCall);
    callFrame.on('transcription-started', handleTranscriptionStarted);
    callFrame.on('transcription-stopped', handleTranscriptionStopped)
    callFrame.on('transcription-error', handleTranscriptionError);
    callFrame.on('custom-button-click', handleCustomButtonClick);
    callFrame.on('app-message', handleNewMessage);

    return () => {
      callFrame.off('left-meeting', leaveCall);
      callFrame.off('transcription-started', handleTranscriptionStarted);
      callFrame.off('transcription-stopped', handleTranscriptionStopped)
      callFrame.off('transcription-error', handleTranscriptionError);
      callFrame.off('custom-button-click', handleCustomButtonClick);
      callFrame.off('app-message', handleNewMessage);
    }
  }, [
    callFrame,
    handleCustomButtonClick,
    handleNewMessage,
    handleTranscriptionError,
    handleTranscriptionStarted,
    handleTranscriptionStopped
  ]);

  const caption = useMemo(() => captions[captions.length - 1], [captions]);

  useEffect(() => {
    if (callFrame) return;
    joinCall();
  }, [callFrame, joinCall]);

  return (
    <div>
      <head>
        <title>Prebuilt Transcriptions</title>
      </head>
      {isTranscribing && caption && <div className="captions">{caption}</div>}
      <div ref={ref} className="call" />
      <style jsx>{`
        .captions {
          background: rgba(8, 8, 8, 0.75);
          z-index: 99;
          position: fixed;
          bottom: 5em;
          padding: 0.5em;
          color: white;
          left: 50%;
          transform: translate(-50%, 0);
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, 
          Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }
      `}
      </style>
    </div>
  );
}

export default Index;
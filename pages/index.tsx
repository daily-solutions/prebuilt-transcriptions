import React, {useCallback, useState, useRef, useEffect, useMemo} from 'react';
import DailyIframe from '@daily-co/daily-js';
import SubtitlesIcon from '../icons/subtitles.svg';
import Image from 'next/image';

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
};

const Index = () => {
  const ref = useRef(null);
  const [callFrame, setCallFrame] = useState(null);
  const [show, setShow] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [captions, setCaptions] = useState([]);

  const url = `https://${process.env.NEXT_PUBLIC_DAILY_DOMAIN}.daily.co/${process.env.NEXT_PUBLIC_DAILY_ROOM}`;

  const handleToggle = useCallback(async () => {
    if (isTranscribing) {
      await callFrame.stopTranscription();
      return;
    }
    await callFrame.startTranscription();
  }, [callFrame, isTranscribing]);

  const handleNewMessage = useCallback(
    (e) => {
      if (e.fromId === 'transcription' && e.data?.is_final) {
        setCaptions(captions =>
          [...captions, `${e.data.user_name}: ${e.data.text}`]
        );
      }
    },
    []
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
    setShow(true);

    const leaveCall = () => {
      setCallFrame(null);
      callFrame.destroy();
    };

    newCallFrame.on('left-meeting', leaveCall);
    newCallFrame.on('transcription-started', handleTranscriptionStarted);
    newCallFrame.on('transcription-stopped', handleTranscriptionStopped)
    newCallFrame.on('transcription-error', handleTranscriptionError);
    newCallFrame.on('app-message', handleNewMessage);
  }, [callFrame, handleNewMessage, handleTranscriptionError, handleTranscriptionStarted, handleTranscriptionStopped, url]);

  useEffect(() => {
    if (callFrame) return;
    joinCall();
  }, [callFrame, joinCall]);

  return (
    <div>
      {show && (
        <button
          type="button"
          className="transcription"
          onClick={handleToggle}
        >
          <Image src={SubtitlesIcon} alt="Subtitle" />
          {isTranscribing ? 'Stop Captions': 'Captions'}
        </button>
      )}
      {isTranscribing && <div className="captions">{captions.slice(-1).pop()}</div>}
      <div ref={ref} className="call" />
      <style jsx>{`
        .transcription {
          z-index: 99;
          position: fixed;
          bottom: 0.5em;
          right: 5em;
          background-color: transparent;
          color: #FFFFFF;
          border: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          cursor: pointer;
        }
        .transcription:hover {
          background-color: #1f2d3d;
        }
        .captions {
          z-index: 99;
          position: fixed;
          bottom: 5em;
          padding: 1em;
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
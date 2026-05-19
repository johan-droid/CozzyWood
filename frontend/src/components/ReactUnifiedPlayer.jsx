import { useEffect, useRef } from "react";
import ReactPlayer from "react-player";

function extractSeconds(value, fallbackValue = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value.playedSeconds === "number") {
    return value.playedSeconds;
  }
  if (value?.currentTarget && typeof value.currentTarget.currentTime === "number") {
    return value.currentTarget.currentTime;
  }
  if (value?.target && typeof value.target.currentTime === "number") {
    return value.target.currentTime;
  }
  return fallbackValue;
}

function ReactUnifiedPlayer({
  src,
  playing = false,
  playbackRate = 1,
  syncCommand = null,
  onPlay = () => {},
  onPause = () => {},
  onWaiting = () => {},
  onPlaying = () => {},
  onRateChange = () => {},
  onTimeUpdate = () => {},
  onSeek = () => {},
}) {
  const playerRef = useRef(null);

  useEffect(() => {
    if (!syncCommand || !playerRef.current) {
      return;
    }
    if (syncCommand.type === "seek" || syncCommand.type === "source-change") {
      const seconds = extractSeconds(syncCommand.positionSeconds, 0);
      if (Number.isFinite(seconds)) {
        playerRef.current.seekTo(seconds, "seconds");
      }
    }
  }, [syncCommand]);

  if (!src) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border border-slate-700 bg-slate-950">
        <p className="text-sm text-slate-400">Select a media source to start playback.</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
      <ReactPlayer
        ref={playerRef}
        src={src}
        controls
        playing={playing}
        playbackRate={playbackRate}
        width="100%"
        height="100%"
        style={{ backgroundColor: "black" }}
        config={{
          file: {
            forceHLS: src.includes(".m3u8"),
          },
        }}
        onPlay={onPlay}
        onPause={onPause}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onRateChange={(event) => {
          const rate = event?.currentTarget?.playbackRate || event?.target?.playbackRate || playbackRate;
          onRateChange(rate);
        }}
        onTimeUpdate={(event) => onTimeUpdate(extractSeconds(event, 0))}
        onSeeking={(event) => onSeek(extractSeconds(event, 0))}
        onSeeked={(event) => onSeek(extractSeconds(event, 0))}
      />
    </div>
  );
}

export default ReactUnifiedPlayer;

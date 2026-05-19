import { useEffect, useRef } from "react";
import Hls from "hls.js";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

function HlsPlyrPlayer({
  src,
  poster,
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
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !src) {
      return undefined;
    }

    const video = videoRef.current;
    const isHls = src.includes(".m3u8");
    if (isHls && Hls.isSupported()) {
      hlsRef.current = new Hls({
        enableWorker: true,
      });
      hlsRef.current.loadSource(src);
      hlsRef.current.attachMedia(video);
    } else {
      video.src = src;
    }

    playerRef.current = new Plyr(video, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
    });

    const player = playerRef.current;
    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("waiting", onWaiting);
    player.on("playing", onPlaying);
    player.on("ratechange", () => onRateChange(player.speed));
    player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
    player.on("seeked", () => onSeek(player.currentTime || 0));

    return () => {
      player.off("play", onPlay);
      player.off("pause", onPause);
      player.off("waiting", onWaiting);
      player.off("playing", onPlaying);
      player.off("ratechange");
      player.off("timeupdate");
      player.off("seeked");
      player.destroy();
      playerRef.current = null;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeAttribute("src");
      video.load();
    };
  }, [src, onPause, onPlay, onPlaying, onRateChange, onSeek, onTimeUpdate, onWaiting]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    if (syncCommand?.type === "seek" || syncCommand?.type === "source-change") {
      const seconds = Number(syncCommand.positionSeconds);
      if (Number.isFinite(seconds)) {
        player.currentTime = seconds;
      }
    }
  }, [syncCommand]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    if (playing) {
      const playAttempt = player.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => {});
      }
      return;
    }
    player.pause();
  }, [playing]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    player.speed = playbackRate;
  }, [playbackRate]);

  return (
    <div className="aspect-video w-full rounded-xl border border-slate-700 bg-black">
      <video
        ref={videoRef}
        className="h-full w-full rounded-xl"
        controls
        playsInline
        poster={poster || undefined}
      />
    </div>
  );
}

export default HlsPlyrPlayer;

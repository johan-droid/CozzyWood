import { useEffect, useMemo, useState } from "react";

function loadSpotifySdk() {
  if (window.Spotify) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("spotify-player-sdk");
    if (existing) {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for Spotify SDK"));
      }, 10_000);
      window.onSpotifyWebPlaybackSDKReady = () => {
        clearTimeout(timeout);
        resolve();
      };
      return;
    }

    const script = document.createElement("script");
    script.id = "spotify-player-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Spotify SDK script"));
    document.body.appendChild(script);

    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for Spotify SDK"));
    }, 10_000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}

function buildPlayPayload(uri) {
  if (uri.startsWith("spotify:track:")) {
    return { uris: [uri] };
  }
  if (uri.startsWith("spotify:album:") || uri.startsWith("spotify:playlist:")) {
    return { context_uri: uri };
  }
  return null;
}

function SpotifyWebPlaybackPanel({ token, selectedUri }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isReady, setIsReady] = useState(false);

  const canInit = Boolean(token);
  const playPayload = useMemo(() => (selectedUri ? buildPlayPayload(selectedUri) : null), [selectedUri]);

  useEffect(() => {
    if (!canInit) {
      return undefined;
    }

    let isMounted = true;
    let spotifyPlayer = null;

    async function setupPlayer() {
      try {
        await loadSpotifySdk();
        if (!isMounted) {
          return;
        }

        spotifyPlayer = new window.Spotify.Player({
          name: "Cozzywood Browser Player",
          getOAuthToken: (callback) => callback(token),
          volume: 0.8,
        });

        spotifyPlayer.addListener("ready", ({ device_id: readyDeviceId }) => {
          if (!isMounted) {
            return;
          }
          setDeviceId(readyDeviceId);
          setStatus("Ready");
          setIsReady(true);
        });
        spotifyPlayer.addListener("not_ready", () => {
          if (!isMounted) {
            return;
          }
          setStatus("Device went offline");
          setIsReady(false);
        });
        spotifyPlayer.addListener("initialization_error", ({ message }) => {
          if (!isMounted) {
            return;
          }
          setStatus(`Init error: ${message}`);
        });
        spotifyPlayer.addListener("authentication_error", ({ message }) => {
          if (!isMounted) {
            return;
          }
          setStatus(`Auth error: ${message}`);
        });
        spotifyPlayer.addListener("account_error", ({ message }) => {
          if (!isMounted) {
            return;
          }
          setStatus(`Account error: ${message}`);
        });

        await spotifyPlayer.connect();
        if (isMounted) {
          setPlayer(spotifyPlayer);
          setStatus("Connecting...");
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error.message || "Failed to initialize Spotify player");
        }
      }
    }

    setupPlayer();

    return () => {
      isMounted = false;
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
      setPlayer(null);
      setDeviceId("");
      setIsReady(false);
    };
  }, [canInit, token]);

  async function handlePlayOnWebPlayer() {
    if (!token || !deviceId || !playPayload) {
      return;
    }
    setStatus("Starting playback...");
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(playPayload),
    });
    if (!response.ok) {
      const bodyText = await response.text();
      setStatus(`Play failed: ${bodyText || response.status}`);
      return;
    }
    setStatus("Playing on browser player");
  }

  async function handlePause() {
    if (!token) {
      return;
    }
    await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setStatus("Paused");
  }

  return (
    <div className="rounded-xl border border-emerald-800/70 bg-emerald-950/20 p-4 text-sm text-emerald-100">
      <h3 className="text-base font-semibold">Spotify Web Playback SDK</h3>
      <p className="mt-1 text-emerald-200/90">
        Requires a Spotify Premium user access token with playback scopes.
      </p>
      <p className="mt-3 text-xs text-emerald-300">Status: {status}</p>
      <p className="mt-1 text-xs text-emerald-300">Device ID: {deviceId || "-"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePlayOnWebPlayer}
          disabled={!isReady || !playPayload || !player}
          className="rounded-md bg-emerald-400 px-3 py-1.5 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Play Selected Spotify Item
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isReady || !player}
          className="rounded-md border border-emerald-600 px-3 py-1.5 font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Pause
        </button>
      </div>
    </div>
  );
}

export default SpotifyWebPlaybackPanel;

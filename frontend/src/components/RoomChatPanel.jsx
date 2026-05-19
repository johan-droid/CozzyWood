import { useEffect, useMemo, useRef, useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { format, formatDistanceToNow } from "date-fns";

function safeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatMessageTime(value) {
  const date = safeDate(value);
  if (!date) {
    return "--";
  }
  return format(date, "hh:mm a");
}

function formatRelativeTime(value) {
  const date = safeDate(value);
  if (!date) {
    return "";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function RoomChatPanel({
  roomId,
  currentUserId,
  messages,
  onSendMessage,
  disabled = false,
}) {
  const [textDraft, setTextDraft] = useState("");
  const [gifUrlDraft, setGifUrlDraft] = useState("");
  const [showGifComposer, setShowGifComposer] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const scrollContainerRef = useRef(null);

  const canSendText = useMemo(
    () => Boolean(textDraft.trim()) && !disabled && !isSending,
    [disabled, isSending, textDraft]
  );
  const canSendGif = useMemo(
    () => Boolean(gifUrlDraft.trim()) && !disabled && !isSending,
    [disabled, gifUrlDraft, isSending]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  async function handleSendText(event) {
    event.preventDefault();
    if (!canSendText) {
      return;
    }

    setIsSending(true);
    setChatError("");
    try {
      await onSendMessage({
        messageType: "TEXT",
        text: textDraft.trim(),
        gifUrl: "",
      });
      setTextDraft("");
      setShowEmojiPicker(false);
    } catch (error) {
      setChatError(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendGif() {
    if (!canSendGif) {
      return;
    }

    setIsSending(true);
    setChatError("");
    try {
      await onSendMessage({
        messageType: "GIF",
        text: "",
        gifUrl: gifUrlDraft.trim(),
      });
      setGifUrlDraft("");
      setShowGifComposer(false);
    } catch (error) {
      setChatError(error.message || "Failed to send GIF");
    } finally {
      setIsSending(false);
    }
  }

  function handleEmojiSelect(emoji) {
    const glyph = emoji?.native || "";
    if (!glyph) {
      return;
    }
    setTextDraft((prev) => `${prev}${glyph}`);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Room Chat</h3>
        <span className="rounded bg-white/10 px-2 py-1 text-xs text-slate-300">
          {messages.length} messages
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2"
      >
        {messages.length ? (
          messages.map((message) => {
            const isOwnMessage = message.userId === currentUserId;
            return (
              <article
                key={message.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isOwnMessage
                    ? "border-amber-700/70 bg-amber-950/20"
                    : "border-white/10 bg-slate-900/80"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-100">
                    {message.user?.name || "User"}
                    {isOwnMessage ? " (You)" : ""}
                  </p>
                  <p className="text-[11px] text-slate-400" title={String(message.createdAt || "")}>
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>

                {message.messageType === "GIF" && message.gifUrl ? (
                  <img
                    src={message.gifUrl}
                    alt="GIF message"
                    className="max-h-44 w-auto rounded-md border border-white/10"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-slate-200">{message.text}</p>
                )}

                <p className="mt-1 text-[11px] text-slate-500">
                  {formatRelativeTime(message.createdAt)}
                </p>
              </article>
            );
          })
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">
            No messages yet. Start the conversation.
          </p>
        )}
      </div>

      <form className="mt-3" onSubmit={handleSendText}>
        <div className="flex gap-2">
          <input
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            disabled={disabled || isSending}
            placeholder={roomId ? "Type a message..." : "Join a room to chat"}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-amber-500/50 focus:ring disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={!canSendText}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Emoji
          </button>
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={() => setShowGifComposer((prev) => !prev)}
            className="rounded-md border border-emerald-700 px-2 py-1 text-xs font-medium text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            GIF URL
          </button>
        </div>
      </form>

      {showGifComposer ? (
        <div className="mt-2 flex gap-2">
          <input
            value={gifUrlDraft}
            onChange={(event) => setGifUrlDraft(event.target.value)}
            disabled={disabled || isSending}
            placeholder="https://media.giphy.com/..."
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-emerald-500/50 focus:ring disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="button"
            onClick={handleSendGif}
            disabled={!canSendGif}
            className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send GIF
          </button>
        </div>
      ) : null}

      {showEmojiPicker ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            navPosition="bottom"
            perLine={8}
          />
        </div>
      ) : null}

      {chatError ? (
        <p className="mt-2 rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {chatError}
        </p>
      ) : null}
    </section>
  );
}

export default RoomChatPanel;

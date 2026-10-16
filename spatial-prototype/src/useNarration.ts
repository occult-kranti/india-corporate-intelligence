import { useCallback, useEffect, useState } from "react";
export function useNarration() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<"off" | "speaking" | "paused">("off");
  const [voiceId, setVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [transcript, setTranscript] = useState("");
  const available =
    typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => {
    if (!available) return;
    const refresh = () =>
      setVoices(
        window.speechSynthesis.getVoices().filter((v) => v.localService),
      );
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.speechSynthesis.cancel();
    };
  }, [available]);
  const stop = useCallback(() => {
    if (available) window.speechSynthesis.cancel();
    setState("off");
  }, [available]);
  const speak = useCallback(
    (text: string) => {
      if (!available || !voices.length) return;
      stop();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice =
        voices.find((v) => v.voiceURI === voiceId) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0];
      utterance.rate = rate;
      utterance.onstart = () => setState("speaking");
      utterance.onend = () => setState("off");
      utterance.onerror = () => setState("off");
      setTranscript(text);
      window.speechSynthesis.speak(utterance);
    },
    [available, voices, voiceId, rate, stop],
  );
  const pause = () => {
    if (!available) return;
    if (state === "paused") {
      window.speechSynthesis.resume();
      setState("speaking");
    } else if (state === "speaking") {
      window.speechSynthesis.pause();
      setState("paused");
    }
  };
  return {
    voices,
    state,
    voiceId,
    setVoiceId,
    rate,
    setRate,
    transcript,
    available,
    speak,
    pause,
    stop,
  };
}

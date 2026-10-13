import { useEffect, useRef, useState } from "react";
import { Player } from "./player";
import type { ChannelOpts } from "./mixer";
import type { Loop } from "../music/model";

export function usePlayer(loop: Loop, channelOpts?: Record<string, ChannelOpts>) {
  const ref = useRef<Player | null>(null);
  if (!ref.current) ref.current = new Player(loop, channelOpts);
  const player = ref.current;
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    player.setLoop(loop);
  }, [player, loop]);

  useEffect(() => {
    const off = player.subscribe((s) => {
      setStep(s);
      setPlaying(player.playing);
      setBusy(player.starting);
    });
    return () => {
      off();
      player.dispose();
    };
  }, [player]);

  return {
    player,
    step,
    playing: playing || busy,
    busy,
    toggle: () => player.toggle(),
    play: () => void player.play(),
    stop: () => player.stop(),
  };
}

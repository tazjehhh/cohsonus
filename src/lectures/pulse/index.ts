import type { LectureDef } from "../types";
import { FindTheOne, FourOnTheFloor, TapAlong, TempoSort } from "./p1";
import { Backbeat, NodBuild, RebuildBoomBap } from "./p2";
import { Faster, OpenHat, Sixteenths, SpotTheHat, Syncopation } from "./p3";
import { GhostNotes, HalfTime, LiveRecord, MatchSwing, ThreeVersions, Velocity } from "./p4";
import { FindTheFill, Tune808, WriteAFill } from "./p5";
import { EarTest, ExplainIt, YourBeat } from "./p6";
import { SwingHistory, TempoHoods } from "./pages";
import { RefreshRebuild, RefreshSwing, RefreshTap } from "./refresh";

export const pulse: LectureDef = {
  id: "pulse",
  number: 1,
  title: "Pulse & Groove",
  parts: [
    {
      id: "p1",
      title: "The pulse",
      note: "Use headphones for this part.",
      minutes: 15,
      steps: [
        { id: "tap", C: TapAlong },
        { id: "sort", C: TempoSort },
        { id: "hoods", C: TempoHoods },
        { id: "one", C: FindTheOne },
        { id: "floor", C: FourOnTheFloor },
      ],
      homework: {
        task: "Tap along to three songs you like. In each one, find the downbeat and count the four beats of the bar from there.",
        listen: [
          { artist: "Frankie Knuckles", title: "Your Love" },
          { artist: "Donna Summer", title: "I Feel Love" },
          { artist: "Daft Punk", title: "Around the World" },
        ],
      },
    },
    {
      id: "p2",
      title: "Kick & snare",
      minutes: 15,
      steps: [
        { id: "build", C: NodBuild },
        { id: "backbeat", C: Backbeat },
        { id: "rebuild", C: RebuildBoomBap },
      ],
      homework: {
        task: "Choose three songs from your own library and check whether the snare lands on beats 2 and 4.",
        listen: [
          { artist: "Michael Jackson", title: "Billie Jean" },
          { artist: "Led Zeppelin", title: "When the Levee Breaks", hint: "One of the most sampled drum sounds ever recorded." },
          { artist: "The Notorious B.I.G.", title: "Juicy" },
        ],
      },
    },
    {
      id: "p3",
      title: "Hats & subdivision",
      minutes: 20,
      steps: [
        { id: "faster", C: Faster },
        { id: "sixteenths", C: Sixteenths },
        { id: "open", C: OpenHat },
        { id: "spot", C: SpotTheHat },
        { id: "sync", C: Syncopation },
      ],
      homework: {
        task: "Follow only the hi-hats in a song. Decide whether they play eighth notes or sixteenth notes, and note where an open hi-hat appears.",
        listen: [
          { artist: "Mr. Fingers", title: "Can You Feel It" },
          { artist: "Chic", title: "Good Times" },
        ],
      },
    },
    {
      id: "p4",
      title: "Groove",
      minutes: 25,
      note: "Keep the keyboard within reach; the F and J keys are used to play drums.",
      steps: [
        { id: "versions", C: ThreeVersions },
        { id: "swing", C: MatchSwing },
        { id: "history", C: SwingHistory },
        { id: "velocity", C: Velocity },
        { id: "ghost", C: GhostNotes },
        { id: "record", C: LiveRecord },
        { id: "half", C: HalfTime },
      ],
      homework: {
        task: "Listen for drums that are played off the grid. Note where they fall slightly behind the beat and where they come slightly ahead of it.",
        listen: [
          { artist: "Slum Village", title: "Fall in Love", hint: "Drums by J Dilla, placed by hand rather than by the grid." },
          { artist: "D'Angelo", title: "Untitled (How Does It Feel)" },
          { artist: "Migos", title: "Bad and Boujee", hint: "A half-time beat: count it at the fast tempo, then at half that tempo." },
        ],
      },
    },
    {
      id: "p5",
      title: "Phrases & the 808",
      minutes: 15,
      steps: [
        { id: "fill", C: FindTheFill },
        { id: "write", C: WriteAFill },
        { id: "808", C: Tune808 },
      ],
      homework: {
        task: "Count the bars of a song until something changes, and check whether the change comes after 4, 8 or 16 bars.",
        listen: [
          { artist: "Outkast", title: "SpottieOttieDopaliscious" },
          { artist: "Kanye West", title: "Love Lockdown", hint: "The 808 is the main instrument of the song." },
        ],
      },
    },
    {
      id: "p6",
      title: "Your beat",
      minutes: 25,
      steps: [
        { id: "beat", C: YourBeat },
        { id: "ear", C: EarTest },
        { id: "explain", C: ExplainIt },
      ],
    },
  ],
  refresher: [
    { id: "tap", part: "p1", C: RefreshTap },
    { id: "rebuild", part: "p2", C: RefreshRebuild },
    { id: "swing", part: "p4", C: RefreshSwing },
  ],
};

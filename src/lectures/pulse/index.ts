import type { LectureDef } from "../types";
import { FindTheOne, FourOnTheFloor, TapAlong, TempoSort } from "./p1";
import { Backbeat, NodBuild, RebuildBoomBap } from "./p2";
import { Faster, OpenHat, Sixteenths, SpotTheHat, Syncopation } from "./p3";
import { GhostNotes, HalfTime, LiveRecord, MatchSwing, ThreeVersions, Velocity } from "./p4";
import { FindTheFill, Tune808, WriteAFill } from "./p5";
import { EarTest, ExplainIt, YourBeat } from "./p6";
import { RefreshRebuild, RefreshSwing, RefreshTap } from "./refresh";

export const pulse: LectureDef = {
  id: "pulse",
  number: 1,
  title: "Pulse & Groove",
  parts: [
    {
      id: "p1",
      title: "The pulse",
      note: "Headphones on.",
      minutes: 15,
      steps: [
        { id: "tap", C: TapAlong },
        { id: "sort", C: TempoSort },
        { id: "one", C: FindTheOne },
        { id: "floor", C: FourOnTheFloor },
      ],
      homework: {
        task: "Tap along to three songs you like. Find the one in each, then count to four from there.",
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
        task: "In three songs from your library: does the snare land on 2 and 4?",
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
        task: "Follow only the hi-hats in a song. Eighths or sixteenths? Where do they open up?",
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
      note: "Keyboard within reach: F and J.",
      steps: [
        { id: "versions", C: ThreeVersions },
        { id: "swing", C: MatchSwing },
        { id: "velocity", C: Velocity },
        { id: "ghost", C: GhostNotes },
        { id: "record", C: LiveRecord },
        { id: "half", C: HalfTime },
      ],
      homework: {
        task: "Listen for drums that are not on the grid. Where do they drag, where do they push?",
        listen: [
          { artist: "Slum Village", title: "Fall in Love", hint: "Drums by J Dilla, placed by hand rather than by the grid." },
          { artist: "D'Angelo", title: "Untitled (How Does It Feel)" },
          { artist: "Migos", title: "Bad and Boujee", hint: "Half-time: count it fast, then slow." },
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
        task: "Count the bars in a song until something changes. Is it 4, 8 or 16?",
        listen: [
          { artist: "Outkast", title: "SpottieOttieDopaliscious" },
          { artist: "Kanye West", title: "Love Lockdown", hint: "The 808 as the main instrument." },
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

import type { LectureDef } from "../types";
import { LayerByLayer, LowMidHigh } from "./pages";
import { BassMoment, Count, Instruments, Map, MuteAndDescribe, RefreshFloor, RefreshRoles, Reveal, RoleTest, SameJob, WhereItLives } from "./parts";

export const anatomy: LectureDef = {
  id: "anatomy",
  number: 0,
  title: "Anatomy of a Track",
  parts: [
    {
      id: "p1",
      title: "Take it apart",
      note: "Use headphones for this part.",
      minutes: 15,
      steps: [
        { id: "count", C: Count },
        { id: "mute", C: MuteAndDescribe },
        { id: "reveal", C: Reveal },
        { id: "bass", C: BassMoment },
        { id: "test", C: RoleTest },
        { id: "layers", C: LayerByLayer },
      ],
      homework: {
        task: "Choose one song and follow only the bass line, from the first second to the last.",
        listen: [
          { artist: "Michael Jackson", title: "Billie Jean" },
          { artist: "A Tribe Called Quest", title: "Can I Kick It?", hint: "The bass line is sampled from Lou Reed's Walk on the Wild Side (1972)." },
          { artist: "Daft Punk", title: "Around the World" },
        ],
      },
    },
    {
      id: "p2",
      title: "Same job, different world",
      minutes: 15,
      steps: [
        { id: "match", C: SameJob },
        { id: "instruments", C: Instruments },
        { id: "space", C: WhereItLives },
        { id: "homes", C: LowMidHigh },
        { id: "map", C: Map },
      ],
      homework: {
        task: "Choose a song you like and name the instrument that does each of the four jobs.",
        listen: [
          { artist: "Fleetwood Mac", title: "Dreams" },
          { artist: "Gorillaz", title: "Feel Good Inc." },
          { artist: "Pete Rock & C.L. Smooth", title: "They Reminisce Over You (T.R.O.Y.)" },
        ],
      },
    },
  ],
  refresher: [
    { id: "roles", part: "p1", C: RefreshRoles },
    { id: "floor", part: "p2", C: RefreshFloor },
  ],
};

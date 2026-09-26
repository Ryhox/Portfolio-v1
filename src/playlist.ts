// The iPod's Music tab: real songs, as the 30-second previews Apple Music offers for every track (streamed
// from Apple, with their cover art, each linking to the full song on Apple Music). The music and artwork
// belong to the artists and their labels.
//
// One line per song: its Apple ID (the `i=` number in a music.apple.com song link, or from
// https://itunes.apple.com/search?term=…&entity=song), title, artist and album. Preview, cover and link are
// looked up from Apple when the iPod first plays something.

export type PlaylistTrack = { apple: number; title: string; artist: string; album: string; explicit?: boolean };

export const playlist: PlaylistTrack[] = [
  { apple: 1631586651, title: "emails i can't send", artist: "Sabrina Carpenter", album: "emails i can't send" },
  { apple: 1795513495, title: "Couldn't Make It Any Harder", artist: "Sabrina Carpenter", album: "Short n' Sweet (Deluxe)", explicit: true },
  { apple: 1631586877, title: "because i liked a boy", artist: "Sabrina Carpenter", album: "emails i can't send" },
  // The iPod era: songs from the iPod ads.
  { apple: 1778047973, title: "Are You Gonna Be My Girl", artist: "Jet", album: "Get Born" },
  { apple: 1440891551, title: "Vertigo", artist: "U2", album: "How to Dismantle an Atomic Bomb" },
  { apple: 1440837804, title: "1234", artist: "Feist", album: "The Reminder" },
];

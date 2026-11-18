// The iPod's Music tab: real songs, as the 30-second previews Apple Music offers for every track (streamed
// from Apple, with their cover art, each linking to the full song on Apple Music). The music and artwork
// belong to the artists and their labels.
//
// One line per song: its Apple ID (the `i=` number in a music.apple.com song link, or from
// https://itunes.apple.com/search?term=…&entity=song), title, artist and album. Preview, cover and link are
// looked up from Apple when the iPod first plays something.

export type PlaylistTrack = { apple: number; title: string; artist: string; album: string; explicit?: boolean };

// The Music menu's playlists, in order. Shuffle Songs plays from all of them.
export const playlists: { name: string; tracks: PlaylistTrack[] }[] = [
  {
    name: "Sabrinaaaa",
    tracks: [
      { apple: 1750307362, title: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet", explicit: true },
      { apple: 1750307080, title: "Please Please Please", artist: "Sabrina Carpenter", album: "Short n' Sweet", explicit: true },
      { apple: 1677892279, title: "Feather", artist: "Sabrina Carpenter", album: "emails i can't send fwd:" },
      { apple: 1631586651, title: "emails i can't send", artist: "Sabrina Carpenter", album: "emails i can't send" },
      { apple: 1795513495, title: "Couldn't Make It Any Harder", artist: "Sabrina Carpenter", album: "Short n' Sweet (Deluxe)", explicit: true },
      { apple: 1631586877, title: "because i liked a boy", artist: "Sabrina Carpenter", album: "emails i can't send" },
    ],
  },
  {
    // The iPod era (2002 to 2008): the songs from the iPod ads first, then the big hits of those years.
    name: "Top 15 in 2000s",
    tracks: [
      { apple: 1778047973, title: "Are You Gonna Be My Girl", artist: "Jet", album: "Get Born" },
      { apple: 1440891551, title: "Vertigo", artist: "U2", album: "How to Dismantle an Atomic Bomb" },
      { apple: 1440837804, title: "1234", artist: "Feist", album: "The Reminder" },
      { apple: 1774799818, title: "Hey Ya!", artist: "Outkast", album: "Speakerboxxx/The Love Below" },
      { apple: 1526194192, title: "Mr. Brightside", artist: "The Killers", album: "Hot Fuss" },
      { apple: 1533513537, title: "Seven Nation Army", artist: "The White Stripes", album: "Elephant" },
      { apple: 850571371, title: "Feel Good Inc.", artist: "Gorillaz", album: "Demon Days" },
      { apple: 1741403966, title: "Crazy", artist: "Gnarls Barkley", album: "St. Elsewhere" },
      { apple: 1472503762, title: "Umbrella (feat. JAY-Z)", artist: "Rihanna", album: "Good Girl Gone Bad" },
      { apple: 201274644, title: "Crazy in Love (feat. JAY-Z)", artist: "Beyoncé", album: "Dangerously in Love" },
      { apple: 315844084, title: "Take Me Out", artist: "Franz Ferdinand", album: "Franz Ferdinand" },
      { apple: 275765380, title: "Since U Been Gone", artist: "Kelly Clarkson", album: "Breakaway" },
      { apple: 1817217063, title: "Hips Don't Lie (feat. Wyclef Jean)", artist: "Shakira", album: "Oral Fixation, Vol. 2" },
      { apple: 1122776156, title: "Clocks", artist: "Coldplay", album: "A Rush of Blood to the Head" },
      { apple: 1122773680, title: "Viva La Vida", artist: "Coldplay", album: "Viva La Vida or Death and All His Friends" },
    ],
  },
];

// Every song, once (what the player looks up from Apple and Shuffle Songs plays).
export const playlist: PlaylistTrack[] = playlists.flatMap((l) => l.tracks);

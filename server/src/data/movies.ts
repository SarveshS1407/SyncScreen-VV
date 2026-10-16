import { MovieItem } from '@watch-party/shared';

export const SAMPLE_MOVIES: MovieItem[] = [
  {
    id: 'sintel-2010',
    title: 'Sintel',
    year: 2010,
    genre: ['Animation', 'Fantasy', 'Adventure'],
    description: 'A lonely young woman, Sintel, helps and befriends a hurt baby dragon she names Scales. But when he is kidnapped by an adult dragon, she embarks on a dangerous quest across an epic wasteland to rescue him.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    durationSeconds: 888, // 14 mins 48s
    rating: 8.4,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    videoType: 'mp4',
    isPlayable: true,
    trailerUrl: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
    vibeTags: ['epic', 'nostalgic', 'suspenseful']
  },
  {
    id: 'tears-of-steel-2012',
    title: 'Tears of Steel',
    year: 2012,
    genre: ['Sci-Fi', 'Action', 'Drama'],
    description: 'Set in a dystopian future Amsterdam, a group of scientists and warriors stage a desperate technological intervention in the Oude Kerk to prevent a catastrophic robotic apocalypse.',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
    durationSeconds: 734, // 12 mins 14s
    rating: 7.9,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    videoType: 'mp4',
    isPlayable: true,
    trailerUrl: 'https://www.youtube.com/watch?v=R6MlUcmOul8',
    vibeTags: ['mind_bending', 'epic', 'suspenseful']
  },
  {
    id: 'big-buck-bunny-2008',
    title: 'Big Buck Bunny',
    year: 2008,
    genre: ['Animation', 'Comedy', 'Family'],
    description: 'A large, gentle rabbit is bullied by three malicious forest creatures: a flying squirrel, a red squirrel, and a chinchilla. When they kill a butterfly, Bunny hatches an elaborate Rube Goldberg-style retribution scheme.',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80',
    durationSeconds: 596, // 9 mins 56s
    rating: 8.1,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoType: 'mp4',
    isPlayable: true,
    trailerUrl: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    vibeTags: ['funny', 'relaxing']
  },
  {
    id: 'elephants-dream-2006',
    title: "Elephants Dream",
    year: 2006,
    genre: ['Sci-Fi', 'Animation', 'Mystery'],
    description: 'Two men, Proog and the younger Emo, journey through a vast, surreal, and sentient labyrinth of machinery known simply as The Machine, grappling with reality and hallucination.',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80',
    durationSeconds: 653,
    rating: 7.2,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    videoType: 'mp4',
    isPlayable: true,
    vibeTags: ['mind_bending', 'suspenseful']
  },
  {
    id: 'for-bigger-blazes-2019',
    title: 'Chromecast Odyssey: Blazes',
    year: 2019,
    genre: ['Documentary', 'Nature'],
    description: 'Spectacular 4K cinema presentation capturing the raw dynamic power of volcanic surges, atmospheric storms, and earth tremors across unexplored island terrain.',
    posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 15,
    rating: 8.6,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoType: 'mp4',
    isPlayable: true,
    vibeTags: ['epic', 'relaxing']
  },
  {
    id: 'for-bigger-escapes-2019',
    title: 'Alpine Escape: Beyond Horizons',
    year: 2020,
    genre: ['Adventure', 'Sport', 'Documentary'],
    description: 'Extreme free-ride snowboarding and mountain expeditions through pristine powder snow corridors in the Swiss and Italian Alps.',
    posterUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 15,
    rating: 8.9,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    videoType: 'mp4',
    isPlayable: true,
    vibeTags: ['epic', 'relaxing']
  },
  {
    id: 'we-are-going-on-bullrun-2018',
    title: 'Coastline Bullrun Rally',
    year: 2018,
    genre: ['Action', 'Thriller'],
    description: 'High-octane road trip thriller following amateur drivers on an underground rally across coastal highways, navigating police checkpoints and rival crews.',
    posterUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 60,
    rating: 7.7,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    videoType: 'mp4',
    isPlayable: true,
    vibeTags: ['epic', 'suspenseful']
  },
  {
    id: 'night-of-the-living-dead-1968',
    title: 'Night of the Living Dead',
    year: 1968,
    genre: ['Horror', 'Mystery', 'Classic'],
    description: 'George A. Romero’s legendary public domain horror masterpiece. A disparate group of individuals take refuge in an abandoned farmhouse when corpses mysteriously begin returning to life.',
    posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 5760, // 96 minutes
    rating: 8.9,
    videoUrl: 'https://ia800501.us.archive.org/22/items/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4',
    videoType: 'mp4',
    isPlayable: true,
    vibeTags: ['suspenseful', 'nostalgic']
  },
  {
    id: 'sample-trailer-cyberpunk',
    title: 'Cyberpunk Horizons (Trailer)',
    year: 2024,
    genre: ['Sci-Fi', 'Action'],
    description: 'Official preview showcase for the dystopian neo-noir series exploring neural implants and corporate espionage in Neo-Shinjuku. (Preview Only).',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 120,
    rating: 9.1,
    videoUrl: '', // Not playable directly - preview/trailer showcase
    videoType: 'custom',
    isPlayable: false,
    trailerUrl: 'https://www.youtube.com/watch?v=qIcTM8WXFjk',
    vibeTags: ['mind_bending', 'epic']
  }
];

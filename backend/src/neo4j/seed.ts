import 'dotenv/config';
import { initNeo4j, getSession, closeNeo4j } from './driver.js';

const GAMES = [
  {
    id: 'lol',
    name: 'League of Legends',
    slug: 'lol',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg',
    hasRanks: true,
    roles: ['Top', 'Jungle', 'Mid', 'ADC', 'Support'],
    ranks: [
      { id: 'lol-iron',        name: 'Iron',        tier: 1 },
      { id: 'lol-bronze',      name: 'Bronze',      tier: 2 },
      { id: 'lol-silver',      name: 'Silver',      tier: 3 },
      { id: 'lol-gold',        name: 'Gold',        tier: 4 },
      { id: 'lol-platinum',    name: 'Platinum',    tier: 5 },
      { id: 'lol-emerald',     name: 'Emerald',     tier: 6 },
      { id: 'lol-diamond',     name: 'Diamond',     tier: 7 },
      { id: 'lol-master',      name: 'Master',      tier: 8 },
      { id: 'lol-grandmaster', name: 'Grandmaster', tier: 9 },
      { id: 'lol-challenger',  name: 'Challenger',  tier: 10 },
    ],
  },
  {
    id: 'valorant',
    name: 'Valorant',
    slug: 'valorant',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Valorant_logo_-_red.svg',
    hasRanks: true,
    roles: ['Duelist', 'Controller', 'Initiator', 'Sentinel'],
    ranks: [
      { id: 'val-iron',        name: 'Iron',        tier: 1 },
      { id: 'val-bronze',      name: 'Bronze',      tier: 2 },
      { id: 'val-silver',      name: 'Silver',      tier: 3 },
      { id: 'val-gold',        name: 'Gold',        tier: 4 },
      { id: 'val-platinum',    name: 'Platinum',    tier: 5 },
      { id: 'val-diamond',     name: 'Diamond',     tier: 6 },
      { id: 'val-ascendant',   name: 'Ascendant',   tier: 7 },
      { id: 'val-immortal',    name: 'Immortal',    tier: 8 },
      { id: 'val-radiant',     name: 'Radiant',     tier: 9 },
    ],
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    slug: 'cs2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/CS2_cover.jpg',
    hasRanks: true,
    roles: ['Entry Fragger', 'Support', 'Lurker', 'AWPer', 'In-Game Leader'],
    ranks: [
      { id: 'cs2-silver1',    name: 'Silver I',           tier: 1 },
      { id: 'cs2-silver2',    name: 'Silver II',          tier: 2 },
      { id: 'cs2-silver3',    name: 'Silver III',         tier: 3 },
      { id: 'cs2-silver4',    name: 'Silver IV',          tier: 4 },
      { id: 'cs2-silverme',   name: 'Silver Elite',       tier: 5 },
      { id: 'cs2-silvermem',  name: 'Silver Elite Master', tier: 6 },
      { id: 'cs2-gn1',        name: 'Gold Nova I',        tier: 7 },
      { id: 'cs2-gn2',        name: 'Gold Nova II',       tier: 8 },
      { id: 'cs2-gn3',        name: 'Gold Nova III',      tier: 9 },
      { id: 'cs2-gnm',        name: 'Gold Nova Master',   tier: 10 },
      { id: 'cs2-mg1',        name: 'Master Guardian I',  tier: 11 },
      { id: 'cs2-mg2',        name: 'Master Guardian II', tier: 12 },
      { id: 'cs2-mge',        name: 'Master Guardian Elite', tier: 13 },
      { id: 'cs2-dme',        name: 'Distinguished Master Guardian', tier: 14 },
      { id: 'cs2-le',         name: 'Legendary Eagle',    tier: 15 },
      { id: 'cs2-lem',        name: 'Legendary Eagle Master', tier: 16 },
      { id: 'cs2-smfc',       name: 'Supreme Master First Class', tier: 17 },
      { id: 'cs2-ge',         name: 'Global Elite',       tier: 18 },
    ],
  },
  {
    id: 'overwatch2',
    name: 'Overwatch 2',
    slug: 'overwatch2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Overwatch_2_logo.svg/1200px-Overwatch_2_logo.svg.png',
    hasRanks: true,
    roles: ['Tank', 'Damage', 'Support'],
    ranks: [
      { id: 'ow2-bronze',      name: 'Bronze',      tier: 1 },
      { id: 'ow2-silver',      name: 'Silver',      tier: 2 },
      { id: 'ow2-gold',        name: 'Gold',        tier: 3 },
      { id: 'ow2-platinum',    name: 'Platinum',    tier: 4 },
      { id: 'ow2-diamond',     name: 'Diamond',     tier: 5 },
      { id: 'ow2-master',      name: 'Master',      tier: 6 },
      { id: 'ow2-grandmaster', name: 'Grandmaster', tier: 7 },
      { id: 'ow2-champion',    name: 'Champion',    tier: 8 },
    ],
  },
  {
    id: 'fortnite',
    name: 'Fortnite',
    slug: 'fortnite',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Fortnite_Battle_Royale_capitalization_-_Icon.png',
    hasRanks: true,
    roles: ['Assaulter', 'Builder', 'Sniper', 'Support'],
    ranks: [
      { id: 'fn-bronze',    name: 'Bronze',   tier: 1 },
      { id: 'fn-silver',    name: 'Silver',   tier: 2 },
      { id: 'fn-gold',      name: 'Gold',     tier: 3 },
      { id: 'fn-platinum',  name: 'Platinum', tier: 4 },
      { id: 'fn-diamond',   name: 'Diamond',  tier: 5 },
      { id: 'fn-elite',     name: 'Elite',    tier: 6 },
      { id: 'fn-champion',  name: 'Champion', tier: 7 },
      { id: 'fn-unreal',    name: 'Unreal',   tier: 8 },
    ],
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    slug: 'apex',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Apex_legends_cover.jpg',
    hasRanks: true,
    roles: ['Fragger', 'Support', 'Recon', 'Controller'],
    ranks: [
      { id: 'apex-bronze',   name: 'Bronze',   tier: 1 },
      { id: 'apex-silver',   name: 'Silver',   tier: 2 },
      { id: 'apex-gold',     name: 'Gold',     tier: 3 },
      { id: 'apex-platinum', name: 'Platinum', tier: 4 },
      { id: 'apex-diamond',  name: 'Diamond',  tier: 5 },
      { id: 'apex-master',   name: 'Master',   tier: 6 },
      { id: 'apex-predator', name: 'Predator', tier: 7 },
    ],
  },
  {
    id: 'rocketleague',
    name: 'Rocket League',
    slug: 'rocketleague',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Rocket_League_coverart.jpg',
    hasRanks: true,
    roles: ['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'],
    ranks: [
      { id: 'rl-bronze',   name: 'Bronze',             tier: 1 },
      { id: 'rl-silver',   name: 'Silver',             tier: 2 },
      { id: 'rl-gold',     name: 'Gold',               tier: 3 },
      { id: 'rl-platinum', name: 'Platinum',           tier: 4 },
      { id: 'rl-diamond',  name: 'Diamond',            tier: 5 },
      { id: 'rl-champion', name: 'Champion',           tier: 6 },
      { id: 'rl-gc',       name: 'Grand Champion',     tier: 7 },
      { id: 'rl-ssl',      name: 'Supersonic Legend',  tier: 8 },
    ],
  },
  {
    id: 'eafc',
    name: 'EA FC / FIFA',
    slug: 'eafc',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/00/EA_FC_24_logo.svg',
    hasRanks: true,
    roles: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    ranks: [
      { id: 'fc-d10', name: 'Division 10', tier: 1 },
      { id: 'fc-d9',  name: 'Division 9',  tier: 2 },
      { id: 'fc-d8',  name: 'Division 8',  tier: 3 },
      { id: 'fc-d7',  name: 'Division 7',  tier: 4 },
      { id: 'fc-d6',  name: 'Division 6',  tier: 5 },
      { id: 'fc-d5',  name: 'Division 5',  tier: 6 },
      { id: 'fc-d4',  name: 'Division 4',  tier: 7 },
      { id: 'fc-d3',  name: 'Division 3',  tier: 8 },
      { id: 'fc-d2',  name: 'Division 2',  tier: 9 },
      { id: 'fc-d1',  name: 'Division 1',  tier: 10 },
      { id: 'fc-ch',  name: 'Champions',   tier: 11 },
    ],
  },
  {
    id: 'fallguys',
    name: 'Fall Guys',
    slug: 'fallguys',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Fall_Guys_logo.svg/1200px-Fall_Guys_logo.svg.png',
    hasRanks: false,
    roles: ['Solo', 'Duo', 'Squad'],
    ranks: [],
  },
  {
    id: 'dota2',
    name: 'Dota 2',
    slug: 'dota2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Dota_2_logo.png',
    hasRanks: true,
    roles: ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'],
    ranks: [
      { id: 'd2-herald',   name: 'Herald',   tier: 1 },
      { id: 'd2-guardian', name: 'Guardian', tier: 2 },
      { id: 'd2-crusader', name: 'Crusader', tier: 3 },
      { id: 'd2-archon',   name: 'Archon',   tier: 4 },
      { id: 'd2-legend',   name: 'Legend',   tier: 5 },
      { id: 'd2-ancient',  name: 'Ancient',  tier: 6 },
      { id: 'd2-divine',   name: 'Divine',   tier: 7 },
      { id: 'd2-immortal', name: 'Immortal', tier: 8 },
    ],
  },
  {
    id: 'r6siege',
    name: 'Rainbow Six Siege',
    slug: 'r6siege',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Tom_Clancy%27s_Rainbow_Six_Siege_Logo.png',
    hasRanks: true,
    roles: ['Attacker', 'Defender', 'Flex', 'Roamer', 'Anchor'],
    ranks: [
      { id: 'r6-copper',   name: 'Copper',   tier: 1 },
      { id: 'r6-bronze',   name: 'Bronze',   tier: 2 },
      { id: 'r6-silver',   name: 'Silver',   tier: 3 },
      { id: 'r6-gold',     name: 'Gold',     tier: 4 },
      { id: 'r6-platinum', name: 'Platinum', tier: 5 },
      { id: 'r6-diamond',  name: 'Diamond',  tier: 6 },
      { id: 'r6-champion', name: 'Champions', tier: 7 },
    ],
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    slug: 'minecraft',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Minecraft_cover.png',
    hasRanks: false,
    roles: ['Survival', 'PvP', 'SkyBlock', 'Creative', 'Hardcore'],
    ranks: [],
  },
];

async function seed() {
  await initNeo4j();
  const session = getSession();

  console.log('Seeding games, roles and ranks...');

  for (const game of GAMES) {
    await session.run(
      `MERGE (g:Game {id: $id})
       SET g.name = $name, g.slug = $slug, g.imageUrl = $imageUrl, g.hasRanks = $hasRanks`,
      { id: game.id, name: game.name, slug: game.slug, imageUrl: game.imageUrl, hasRanks: game.hasRanks }
    );

    for (const roleName of game.roles) {
      const roleId = `${game.id}-role-${roleName.toLowerCase().replace(/\s+/g, '-')}`;
      await session.run(
        `MERGE (r:Role {id: $id}) SET r.name = $name, r.gameId = $gameId`,
        { id: roleId, name: roleName, gameId: game.id }
      );
    }

    for (const rank of game.ranks) {
      await session.run(
        `MERGE (r:Rank {id: $id}) SET r.name = $name, r.tier = $tier, r.gameId = $gameId`,
        { id: rank.id, name: rank.name, tier: rank.tier, gameId: game.id }
      );
    }

    console.log(`  ✓ ${game.name} (${game.roles.length} roles, ${game.ranks.length} ranks)`);
  }

  await session.close();
  await closeNeo4j();
  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

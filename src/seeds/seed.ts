import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pet } from '../entities/pet.entity';
import { Swipe } from '../entities/swipe.entity';
import { Match } from '../entities/match.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import * as bcrypt from 'bcrypt';

// Coordenadas de bairros de São Paulo (latitude, longitude)
const SP_LOCATIONS = [
  { nome: 'Centro', lat: -23.5505, lon: -46.6333 },
  { nome: 'Vila Madalena', lat: -23.5471, lon: -46.6919 },
  { nome: 'Pinheiros', lat: -23.5655, lon: -46.6878 },
  { nome: 'Jardins', lat: -23.5687, lon: -46.6744 },
  { nome: 'Moema', lat: -23.6084, lon: -46.6734 },
  { nome: 'Vila Olímpia', lat: -23.5934, lon: -46.6884 },
  { nome: 'Itaim Bibi', lat: -23.5823, lon: -46.6794 },
  { nome: 'Brooklin', lat: -23.6104, lon: -46.6863 },
  { nome: 'Campo Belo', lat: -23.6204, lon: -46.6734 },
  { nome: 'Santo André', lat: -23.6667, lon: -46.5333 },
  { nome: 'São Bernardo', lat: -23.6939, lon: -46.565 },
  { nome: 'Osasco', lat: -23.5329, lon: -46.7915 },
  { nome: 'Guarulhos', lat: -23.4538, lon: -46.5331 },
  { nome: 'Barueri', lat: -23.5107, lon: -46.8761 },
  { nome: 'São Caetano', lat: -23.6231, lon: -46.5512 },
  { nome: 'Diadema', lat: -23.6864, lon: -46.6228 },
  { nome: 'Mauá', lat: -23.6677, lon: -46.4613 },
  { nome: 'Ribeirão Pires', lat: -23.7142, lon: -46.4158 },
  { nome: 'Rio Grande da Serra', lat: -23.7439, lon: -46.3981 },
  { nome: 'Suzano', lat: -23.5428, lon: -46.3108 },
];

// Raças de cães populares
const RACAS_CAES = [
  'Golden Retriever',
  'Labrador',
  'Bulldog Francês',
  'Poodle',
  'Shih Tzu',
  'Yorkshire',
  'Pastor Alemão',
  'Rottweiler',
  'Husky Siberiano',
  'Border Collie',
  'Beagle',
  'Bulldog Inglês',
  'Chihuahua',
  'Pug',
  'Dachshund',
  'Cocker Spaniel',
  'Boxer',
  'Doberman',
  'Maltês',
  'Lhasa Apso',
  'Schnauzer',
  'Basset Hound',
  'Akita',
  'Shiba Inu',
  'São Bernardo',
];

// Raças de gatos populares
const RACAS_GATOS = [
  'Persa',
  'Siamês',
  'Maine Coon',
  'Ragdoll',
  'British Shorthair',
  'American Shorthair',
  'Bengal',
  'Abyssinian',
  'Russian Blue',
  'Scottish Fold',
  'Sphynx',
  'Norwegian Forest',
  'Turkish Angora',
  'Birman',
  'Exotic Shorthair',
];

// Nomes de pets
const NOMES_PETS = [
  'Luna',
  'Thor',
  'Max',
  'Bella',
  'Charlie',
  'Lucy',
  'Milo',
  'Daisy',
  'Rocky',
  'Lola',
  'Zeus',
  'Mia',
  'Toby',
  'Sophie',
  'Jack',
  'Lily',
  'Oscar',
  'Chloe',
  'Buddy',
  'Ruby',
  'Cooper',
  'Maya',
  'Bear',
  'Zoe',
  'Leo',
  'Penny',
  'Duke',
  'Stella',
  'Jax',
  'Nala',
  'Bailey',
  'Rex',
  'Lulu',
  'Gus',
  'Molly',
  'Tank',
  'Jake',
  'Rosie',
];

const PORTES = ['Pequeno', 'Médio', 'Grande'];
const ESPECIES = ['Cão', 'Gato'];

function getPetPhotoUrls(especie: string, seed: number): string[] {
  if (especie === 'Cão') {
    return [
      `https://placedog.net/400/400?id=${(seed % 200) + 1}`,
      `https://placedog.net/401/401?id=${((seed + 37) % 200) + 1}`,
    ];
  }

  return [
    `https://cataas.com/cat?width=400&height=400&hash=${seed + 1}`,
    `https://cataas.com/cat?width=401&height=401&hash=${seed + 38}`,
  ];
}

// Gerar data de nascimento aleatória (entre 1 e 5 anos atrás)
function randomBirthDate(): Date {
  const yearsAgo = Math.floor(Math.random() * 5) + 1;
  const monthsAgo = Math.floor(Math.random() * 12);
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
}

// Gerar descrição aleatória
function randomDescription(
  especie: string,
  raca: string,
  genero: string,
): string {
  const adjetivos = [
    'carinhoso',
    'brincalhão',
    'inteligente',
    'leal',
    'energético',
    'tranquilo',
    'amigável',
    'protetor',
  ];
  const adjetivo = adjetivos[Math.floor(Math.random() * adjetivos.length)];

  return `${raca} ${adjetivo}${genero === 'Fêmea' ? 'a' : ''}. Muito ${adjetivo} e companheiro${genero === 'Fêmea' ? 'a' : ''}. Ideal para reprodução responsável.`;
}

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const petRepository = dataSource.getRepository(Pet);
  const swipeRepository = dataSource.getRepository(Swipe);
  const matchRepository = dataSource.getRepository(Match);
  const conversationRepository = dataSource.getRepository(Conversation);
  const messageRepository = dataSource.getRepository(Message);

  // Limpar dados existentes (ordem reversa das dependências)
  await messageRepository.clear();
  await conversationRepository.clear();
  await matchRepository.clear();
  await swipeRepository.clear();
  await petRepository.clear();
  await userRepository.clear();

  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar muitos usuários
  const users: User[] = [];
  const totalUsers = 50;

  for (let i = 0; i < totalUsers; i++) {
    const location = SP_LOCATIONS[i % SP_LOCATIONS.length];

    // Variação nas coordenadas para criar mais diversidade (variação de ~2km)
    const latVariation = (Math.random() - 0.5) * 0.02; // ~2km
    const lonVariation = (Math.random() - 0.5) * 0.02;
    const finalLat = location.lat + latVariation;
    const finalLon = location.lon + lonVariation;
    const finalLocationJson = JSON.stringify({
      latitude: finalLat,
      longitude: finalLon,
    });

    // Alcance máximo variado: 5km, 10km, 20km, 50km
    const raios = [5, 10, 20, 50];
    const raioMaximo = raios[Math.floor(Math.random() * raios.length)];

    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = userRepository.create({
      nome: `Usuário ${i + 1} - ${location.nome}`,
      email: `usuario${i + 1}@teste.com`,
      telefone: `(11) 99999-${String(i + 1).padStart(4, '0')}`,
      senha_hash: hashedPassword,
      localizacao_geo: finalLocationJson,
      raio_maximo: raioMaximo,
    });
    const savedUser = await userRepository.save(user);
    users.push(savedUser);
  }

  console.log(`✅ Criados ${users.length} usuários`);

  // Criar muitos pets (média de 2-3 pets por usuário)
  const pets: Pet[] = [];
  const totalPets = 120;

  for (let i = 0; i < totalPets; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const especie = ESPECIES[Math.floor(Math.random() * ESPECIES.length)];
    const raca =
      especie === 'Cão'
        ? RACAS_CAES[Math.floor(Math.random() * RACAS_CAES.length)]
        : RACAS_GATOS[Math.floor(Math.random() * RACAS_GATOS.length)];
    const porte = PORTES[Math.floor(Math.random() * PORTES.length)];
    const nome =
      NOMES_PETS[Math.floor(Math.random() * NOMES_PETS.length)] + ` ${i + 1}`;

    // Garantir diversidade de gêneros para possibilitar matches
    // Alternar entre macho e fêmea para ter bons matches
    const finalGenero = i % 2 === 0 ? 'Macho' : 'Fêmea';

    const petData = {
      nome,
      especie,
      raca,
      data_nascimento: randomBirthDate(),
      genero: finalGenero,
      porte,
      descricao: randomDescription(especie, raca, finalGenero),
      pedigree: Math.random() > 0.3, // 70% têm pedigree
      fk_usuario_id: user.id,
      fotos: JSON.stringify(getPetPhotoUrls(especie, i)),
      dados_saude: JSON.stringify({
        vacinado: true,
        castrado: false,
        ultima_consulta: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
      verificado_clinica: Math.random() > 0.5, // 50% verificados
    };

    const pet = petRepository.create(petData);
    const savedPet = await petRepository.save(pet);
    pets.push(savedPet);
  }

  console.log(`✅ Criados ${pets.length} pets`);

  // Criar alguns matches e swipes para testar
  console.log('✅ Seed concluído com sucesso!');
  console.log(`📍 Localizações: ${SP_LOCATIONS.length} bairros de São Paulo`);
  console.log(
    `👥 Usuários: ${users.length} com localização e alcance configurado`,
  );
  console.log(`🐾 Pets: ${pets.length} distribuídos entre os usuários`);
  console.log(`🔐 Senha padrão para todos: 123456`);
  console.log(
    `📧 Emails: usuario1@teste.com até usuario${totalUsers}@teste.com`,
  );

  return { users, pets };
}

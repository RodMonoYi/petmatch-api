import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pet } from '../entities/pet.entity';
import { Match } from '../entities/match.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Swipe } from '../entities/swipe.entity';
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

  // Limpar dados existentes
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
  const hashedPassword = await bcrypt.hash('123456', 10);

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

  const createSeedPet = async (
    user: User,
    petData: {
      nome: string;
      especie: string;
      raca: string;
      data_nascimento: Date;
      genero: string;
      porte: string;
      descricao: string;
      pedigree: boolean;
      fotos: string[];
      verificado_clinica: boolean;
      disponivel_reproducao?: boolean;
      aceita_viagem?: boolean;
    },
  ) => {
    const { fotos, ...petFields } = petData;
    const pet = petRepository.create({
      ...petFields,
      fk_usuario_id: user.id,
      fotos: JSON.stringify(fotos),
      dados_saude: JSON.stringify({
        vacinado: true,
        castrado: false,
        ultima_consulta: new Date('2026-05-15T10:00:00.000Z').toISOString(),
      }),
    });
    const savedPet = await petRepository.save(pet);
    pets.push(savedPet);
    return savedPet;
  };

  const luna = await createSeedPet(users[0], {
    nome: 'Luna Golden',
    especie: 'Cão',
    raca: 'Golden Retriever',
    data_nascimento: new Date('2022-03-15'),
    genero: 'Fêmea',
    porte: 'Grande',
    descricao: 'Golden Retriever dócil, sociável e com vacinas em dia.',
    pedigree: true,
    fotos: ['https://picsum.photos/seed/luna-golden/400/400'],
    verificado_clinica: true,
    disponivel_reproducao: true,
    aceita_viagem: true,
  });

  const thor = await createSeedPet(users[1], {
    nome: 'Thor Golden',
    especie: 'Cão',
    raca: 'Golden Retriever',
    data_nascimento: new Date('2021-11-08'),
    genero: 'Macho',
    porte: 'Grande',
    descricao: 'Golden Retriever calmo, saudável e acostumado com outros cães.',
    pedigree: true,
    fotos: ['https://picsum.photos/seed/thor-golden/400/400'],
    verificado_clinica: true,
    disponivel_reproducao: true,
    aceita_viagem: false,
  });

  const mia = await createSeedPet(users[0], {
    nome: 'Mia Persa',
    especie: 'Gato',
    raca: 'Persa',
    data_nascimento: new Date('2023-01-20'),
    genero: 'Fêmea',
    porte: 'Pequeno',
    descricao: 'Gata Persa tranquila, carinhosa e com acompanhamento veterinário.',
    pedigree: true,
    fotos: ['https://picsum.photos/seed/mia-persa/400/400'],
    verificado_clinica: true,
    disponivel_reproducao: true,
    aceita_viagem: false,
  });

  const simba = await createSeedPet(users[2], {
    nome: 'Simba Persa',
    especie: 'Gato',
    raca: 'Persa',
    data_nascimento: new Date('2022-09-02'),
    genero: 'Macho',
    porte: 'Pequeno',
    descricao: 'Gato Persa sociável, vacinado e com exames recentes.',
    pedigree: true,
    fotos: ['https://picsum.photos/seed/simba-persa/400/400'],
    verificado_clinica: true,
    disponivel_reproducao: true,
    aceita_viagem: true,
  });

  const bella = await createSeedPet(users[3], {
    nome: 'Bella Poodle',
    especie: 'Cão',
    raca: 'Poodle',
    data_nascimento: new Date('2022-06-10'),
    genero: 'Fêmea',
    porte: 'Pequeno',
    descricao: 'Poodle brincalhona, dócil e acostumada com crianças.',
    pedigree: false,
    fotos: ['https://picsum.photos/seed/bella-poodle/400/400'],
    verificado_clinica: true,
    disponivel_reproducao: true,
    aceita_viagem: false,
  });

  const max = await createSeedPet(users[4], {
    nome: 'Max Poodle',
    especie: 'Cão',
    raca: 'Poodle',
    data_nascimento: new Date('2021-12-18'),
    genero: 'Macho',
    porte: 'Pequeno',
    descricao: 'Poodle ativo, saudável e muito sociável.',
    pedigree: false,
    fotos: ['https://picsum.photos/seed/max-poodle/400/400'],
    verificado_clinica: false,
    disponivel_reproducao: true,
    aceita_viagem: true,
  });

  const randomPetsToCreate = totalPets - pets.length;

  for (let i = 0; i < randomPetsToCreate; i++) {
    const petNumber = pets.length + 1;
    const user = users[Math.floor(Math.random() * users.length)];
    const especie = ESPECIES[Math.floor(Math.random() * ESPECIES.length)];
    const raca =
      especie === 'Cão'
        ? RACAS_CAES[Math.floor(Math.random() * RACAS_CAES.length)]
        : RACAS_GATOS[Math.floor(Math.random() * RACAS_GATOS.length)];
    const porte = PORTES[Math.floor(Math.random() * PORTES.length)];
    const nome =
      NOMES_PETS[Math.floor(Math.random() * NOMES_PETS.length)] + ` ${petNumber}`;

    // Garantir diversidade de gêneros para possibilitar matches
    // Alternar entre macho e fêmea para ter bons matches
    const finalGenero = petNumber % 2 === 0 ? 'Macho' : 'Fêmea';

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
      fotos: JSON.stringify([`https://picsum.photos/seed/${nome}${petNumber}/400/400`]),
      dados_saude: JSON.stringify({
        vacinado: true,
        castrado: false,
        ultima_consulta: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
      verificado_clinica: Math.random() > 0.5, // 50% verificados
      disponivel_reproducao: Math.random() > 0.15,
      aceita_viagem: Math.random() > 0.65,
    };

    const pet = petRepository.create(petData);
    const savedPet = await petRepository.save(pet);
    pets.push(savedPet);
  }

  console.log(`✅ Criados ${pets.length} pets`);

  const createSeedMatch = async (
    pet1: Pet,
    pet2: Pet,
    messages: Array<{ sender: 'pet1' | 'pet2'; conteudo: string }>,
  ) => {
    await swipeRepository.save([
      swipeRepository.create({
        fk_pet_id_1: pet1.id,
        fk_pet_id_2: pet2.id,
        action: 'like',
      }),
      swipeRepository.create({
        fk_pet_id_1: pet2.id,
        fk_pet_id_2: pet1.id,
        action: 'like',
      }),
    ]);

    const match = await matchRepository.save(
      matchRepository.create({
        fk_pet_id_1: pet1.id,
        fk_pet_id_2: pet2.id,
        status: 'aceito',
      }),
    );

    const conversation = await conversationRepository.save(
      conversationRepository.create({
        fk_match_id: match.id,
        fk_participante_1_id: pet1.fk_usuario_id,
        fk_participante_2_id: pet2.fk_usuario_id,
      }),
    );

    for (const message of messages) {
      await messageRepository.save(
        messageRepository.create({
          fk_conversa_id: conversation.id,
          fk_remetente_id:
            message.sender === 'pet1' ? pet1.fk_usuario_id : pet2.fk_usuario_id,
          conteudo: message.conteudo,
        }),
      );
    }

    return { match, conversation };
  };

  const matchExamples = [
    await createSeedMatch(luna, thor, [
      {
        sender: 'pet1',
        conteudo:
          'Oi! Vi que o Thor também é Golden e parece ter um temperamento ótimo.',
      },
      {
        sender: 'pet2',
        conteudo:
          'Oi! Sim, ele é bem tranquilo. A Luna também tem pedigree e exames recentes?',
      },
      {
        sender: 'pet1',
        conteudo:
          'Tem sim. Posso te enviar os exames e a carteirinha de vacinação.',
      },
      {
        sender: 'pet2',
        conteudo:
          'Perfeito. Podemos marcar uma conversa com a veterinária essa semana.',
      },
    ]),
    await createSeedMatch(mia, simba, [
      {
        sender: 'pet2',
        conteudo:
          'Olá! O Simba é Persa e já fez check-up este mês. A Mia é tranquila com outros gatos?',
      },
      {
        sender: 'pet1',
        conteudo:
          'É bem tranquila e sociável. Também estamos priorizando acompanhamento veterinário.',
      },
      {
        sender: 'pet2',
        conteudo:
          'Ótimo. Posso compartilhar o histórico de saúde dele pelo chat.',
      },
    ]),
    await createSeedMatch(bella, max, [
      {
        sender: 'pet1',
        conteudo:
          'Oi! A Bella e o Max parecem compatíveis pelo porte e temperamento.',
      },
      {
        sender: 'pet2',
        conteudo:
          'Também achei. O Max é bem ativo, mas se adapta fácil.',
      },
      {
        sender: 'pet1',
        conteudo:
          'Vamos combinar uma chamada para conversar melhor sobre os cuidados?',
      },
    ]),
  ];

  console.log('✅ Seed concluído com sucesso!');
  console.log(`📍 Localizações: ${SP_LOCATIONS.length} bairros de São Paulo`);
  console.log(
    `👥 Usuários: ${users.length} com localização e alcance configurado`,
  );
  console.log(`🐾 Pets: ${pets.length} distribuídos entre os usuários`);
  console.log(`💕 Matches de exemplo: ${matchExamples.length}`);
  console.log(`💬 Conversas com mensagens: ${matchExamples.length}`);
  console.log(`🔐 Senha padrão para todos: 123456`);
  console.log(
    `📧 Emails: usuario1@teste.com até usuario${totalUsers}@teste.com`,
  );

  return { users, pets };
}

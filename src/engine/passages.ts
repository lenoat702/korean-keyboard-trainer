// Sentences for stage 9 and longer texts for stage 10, each with an English translation.
// A sentence joins the drill pool once every unit it needs (its punctuation, numbers) is
// unlocked; passages.test.ts checks that each one can be typed on the layout.

export interface Passage {
  text: string;
  meaning: string;
  stage: 9 | 10;
}

type Entry = readonly [text: string, meaning: string];

const SENTENCES: Entry[] = [
  // Full stops only: the first stage-9 unit.
  ['저는 학생이에요.', "I'm a student."],
  ['오늘 날씨가 좋아요.', 'The weather is nice today.'],
  ['만나서 반갑습니다.', 'Nice to meet you.'],
  ['저는 커피를 좋아해요.', 'I like coffee.'],
  ['친구와 같이 영화를 봤어요.', 'I watched a film with a friend.'],
  ['내일 학교에 가요.', "I'm going to school tomorrow."],
  ['집에서 책을 읽어요.', 'I read a book at home.'],
  ['비가 많이 와요.', "It's raining a lot."],
  ['지금 밥을 먹고 있어요.', "I'm eating right now."],
  ['한국어를 공부하고 있어요.', "I'm studying Korean."],
  ['주말에 바다에 갔어요.', 'I went to the sea at the weekend.'],
  ['이 사과는 정말 맛있어요.', 'This apple is really tasty.'],
  ['언니는 회사에 다녀요.', 'My older sister works at a company.'],
  ['버스를 타고 왔어요.', 'I came by bus.'],
  ['오늘은 조금 피곤해요.', "I'm a little tired today."],
  ['저녁에 운동을 해요.', 'I exercise in the evening.'],
  // Commas
  ['네, 알겠습니다.', 'Yes, I understand.'],
  ['아니요, 괜찮아요.', "No, it's okay."],
  ['배가 고파서, 빵을 샀어요.', 'I was hungry, so I bought bread.'],
  ['커피, 우유, 빵을 샀어요.', 'I bought coffee, milk and bread.'],
  ['비가 와서, 집에 있었어요.', 'It rained, so I stayed home.'],
  ['엄마, 저 왔어요.', "Mum, I'm home."],
  ['봄, 여름, 가을, 겨울 중에서 봄이 좋아요.', 'Of the four seasons, I like spring best.'],
  ['피곤하지만, 숙제를 해야 해요.', "I'm tired, but I have to do my homework."],
  // Questions
  ['이름이 뭐예요?', "What's your name?"],
  ['어디에 가요?', 'Where are you going?'],
  ['이거 얼마예요?', 'How much is this?'],
  ['화장실이 어디예요?', 'Where is the toilet?'],
  ['한국 음식을 좋아해요?', 'Do you like Korean food?'],
  ['내일 시간 있어요?', 'Are you free tomorrow?'],
  ['무슨 영화를 봤어요?', 'What film did you watch?'],
  ['왜 늦었어요?', 'Why were you late?'],
  ['커피 마실래요?', 'Would you like some coffee?'],
  ['네, 좋아요. 언제 만날까요?', 'Yes, sounds good. When shall we meet?'],
  // Numbers
  ['3시에 만나요.', "Let's meet at 3 o'clock."],
  ['사과가 5개 있어요.', 'There are 5 apples.'],
  ['커피는 4500원이에요.', 'The coffee is 4,500 won.'],
  ['저는 2003년에 태어났어요.', 'I was born in 2003.'],
  ['버스는 10분 후에 와요.', 'The bus comes in 10 minutes.'],
  ['우리 반에는 학생이 20명 있어요.', 'There are 20 students in our class.'],
  ['7월 15일이 제 생일이에요.', 'July 15th is my birthday.'],
  ['하루에 물을 2리터 마셔요.', 'I drink 2 litres of water a day.'],
  ['아침 8시에 일어나요.', 'I get up at 8 in the morning.'],
  ['몇 시예요? 지금 9시 반이에요.', "What time is it? It's half past 9."],
  // Exclamations
  ['와, 정말 예쁘다!', "Wow, it's really pretty!"],
  ['생일 축하해요!', 'Happy birthday!'],
  ['맛있어요!', "It's delicious!"],
  ['조심하세요!', 'Be careful!'],
  ['화이팅!', 'You can do it!'],
  ['빨리 와요!', 'Come quickly!'],
  ['새해 복 많이 받으세요!', 'Happy New Year!'],
  ['감사합니다! 잘 먹겠습니다.', "Thank you! I'll enjoy the meal."],
];

const FREE_TEXTS: Entry[] = [
  // Traditional proverbs
  ['가는 말이 고와야 오는 말이 곱다.', 'Speak kindly and you will be spoken to kindly.'],
  ['낮말은 새가 듣고 밤말은 쥐가 듣는다.', 'Birds hear the day talk, mice the night talk: walls have ears.'],
  ['천 리 길도 한 걸음부터.', 'A thousand-li road starts with one step.'],
  ['세 살 버릇 여든까지 간다.', 'Habits from age three last until eighty.'],
  ['백지장도 맞들면 낫다.', 'Even a sheet of paper is lighter lifted together.'],
  ['원숭이도 나무에서 떨어진다.', 'Even monkeys fall from trees.'],
  ['소 잃고 외양간 고친다.', 'Fixing the barn after the cow is lost.'],
  ['고생 끝에 낙이 온다.', 'After hardship comes joy.'],
  ['시작이 반이다.', 'Starting is half the work.'],
  ['아는 길도 물어 가라.', 'Ask the way even when you know it.'],
  ['티끌 모아 태산.', 'Gather specks of dust and make a mountain.'],
  ['우물 안 개구리.', 'A frog in a well.'],
  ['금강산도 식후경.', 'Even Mount Geumgang is best seen after a meal.'],
  ['등잔 밑이 어둡다.', "It's darkest under the lamp."],
  ['호랑이도 제 말 하면 온다.', 'Speak of the tiger and it appears.'],
  // Short paragraphs
  [
    '저는 매일 아침 7시에 일어나요. 물을 한 잔 마시고, 30분 동안 걸어요. 그다음에 아침을 먹어요.',
    'I get up at 7 every morning. I drink a glass of water and walk for 30 minutes. Then I have breakfast.',
  ],
  [
    '지난 주말에 친구와 시장에 갔어요. 사람이 정말 많았어요! 우리는 떡볶이와 김밥을 먹었어요.',
    'Last weekend I went to the market with a friend. It was so busy! We ate tteokbokki and gimbap.',
  ],
  [
    '한국어를 배운 지 3개월이 됐어요. 아직 어렵지만, 정말 재미있어요. 언젠가 한국에 여행을 가고 싶어요.',
    "I've been learning Korean for 3 months. It's still hard, but it's really fun. I want to visit Korea someday.",
  ],
  [
    '오늘은 비가 와서 집에 있었어요. 따뜻한 차를 마시면서 책을 읽었어요. 조용하고 좋은 하루였어요.',
    'It rained today, so I stayed home. I read a book over a cup of warm tea. It was a quiet, good day.',
  ],
  [
    '우리 동네에는 작은 공원이 있어요. 저녁마다 사람들이 강아지와 산책을 해요. 저도 가끔 거기서 운동을 해요.',
    'There is a small park in my neighbourhood. Every evening people walk their dogs there. I sometimes exercise there too.',
  ],
  [
    '내일은 엄마 생신이에요. 케이크를 사고, 편지도 썼어요. 엄마가 좋아하시면 좋겠어요!',
    "Tomorrow is Mum's birthday. I bought a cake and wrote a letter too. I hope she likes it!",
  ],
];

export const PASSAGES: Passage[] = [
  ...SENTENCES.map(([text, meaning]) => ({ text, meaning, stage: 9 as const })),
  ...FREE_TEXTS.map(([text, meaning]) => ({ text, meaning, stage: 10 as const })),
];

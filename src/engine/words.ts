// Practice words by stage, each with a short English meaning. A word joins the drill pool once
// its stage is reached and every key it needs is unlocked. words.test.ts checks each list
// against its stage.

type Entry = readonly [text: string, meaning: string];

const BY_STAGE: Record<number, Entry[]> = {
  1: [
    ['아', 'ah'], ['이', 'tooth; this'], ['나', 'I, me'], ['라', 'la (note)'], ['마', 'yam'], ['어', 'oh'],
    ['너', 'you'], ['머', 'what (casual)'], ['니', 'you (spoken)'], ['리', 'ri (distance)'], ['미', 'mi (note)'],
    ['아이', 'child'], ['나라', 'country'], ['나이', 'age'], ['아니', 'no'], ['이리', 'this way'], ['나리', 'lily'],
    ['마리', '(animal counter)'], ['머리', 'head; hair'], ['이마', 'forehead'], ['미리', 'in advance'],
    ['어머니', 'mother'], ['너머', 'beyond'], ['아마', 'maybe'], ['어미', 'mother (animal)'],
  ],
  2: [
    // First finals ㄴ ㅇ ㄹ ㅁ
    ['엄마', 'mum'], ['언니', 'older sister'], ['할머니', 'grandmother'], ['안', 'inside; not'], ['남', 'others; south'],
    ['날', 'day'], ['말', 'word; horse'], ['일', 'work; one'], ['힘', 'strength'], ['한', 'one; about'],
    ['알림', 'notification'], ['놀람', 'surprise'], ['모임', 'gathering'],
    // The jumping final: the consonant moves to start the next syllable
    ['하나', 'one'], ['오리', 'duck'], ['노란', 'yellow'], ['놀이', 'play; game'], ['인어', 'mermaid'],
    ['몰라', "I don't know"], ['홀로', 'alone'], ['알아', 'I know'], ['놀아', 'play!'], ['일어나', 'get up'],
    ['호랑이', 'tiger'], ['오이', 'cucumber'], ['호미', 'hoe'], ['이모', 'aunt'], ['미로', 'maze'], ['머리말', 'preface'],
  ],
  3: [
    ['가방', 'bag'], ['사랑', 'love'], ['학교', 'school'], ['안녕', 'hi; bye'], ['선생님', 'teacher'], ['시간', 'time'],
    ['사람', 'person'], ['학생', 'student'], ['여자', 'woman'], ['남자', 'man'], ['아버지', 'father'],
    ['동생', 'younger sibling'], ['가게', 'shop'], ['시장', 'market'], ['집', 'house'], ['밥', 'rice; meal'],
    ['바다', 'sea'], ['산', 'mountain'], ['강', 'river'], ['별', 'star'], ['달', 'moon'], ['해', 'sun'],
    ['여기', 'here'], ['저기', 'over there'], ['거기', 'there'], ['내일', 'tomorrow'], ['어제', 'yesterday'],
    ['저녁', 'evening'], ['배', 'pear; boat'], ['개', 'dog'], ['고양이', 'cat'], ['강아지', 'puppy'],
    ['생일', 'birthday'], ['가족', 'family'], ['형', 'older brother'], ['여행', 'trip'], ['노래', 'song'],
    ['사랑해', 'I love you'], ['감사합니다', 'thank you'], ['안녕하세요', 'hello'], ['좋아요', 'good; I like it'],
    ['재미', 'fun'], ['이야기', 'story'], ['약', 'medicine'], ['지도', 'map'], ['바지', 'trousers'], ['모자', 'hat'],
    ['신발', 'shoes'], ['사전', 'dictionary'], ['먹다', 'to eat'], ['가다', 'to go'], ['보다', 'to see'],
    ['자다', 'to sleep'], ['기다리다', 'to wait'],
  ],
  4: [
    ['한국', 'Korea'], ['친구', 'friend'], ['우유', 'milk'], ['커피', 'coffee'], ['컴퓨터', 'computer'],
    ['오늘', 'today'], ['이름', 'name'], ['책', 'book'], ['물', 'water'], ['아침', 'morning'], ['마음', 'heart; mind'],
    ['하늘', 'sky'], ['음식', 'food'], ['문', 'door'], ['눈', 'eye; snow'], ['코', 'nose'], ['손', 'hand'],
    ['발', 'foot'], ['크다', 'to be big'], ['작다', 'to be small'], ['좋다', 'to be good'], ['춥다', 'to be cold'],
    ['덥다', 'to be hot'], ['비', 'rain'], ['구름', 'cloud'], ['바람', 'wind'], ['겨울', 'winter'], ['여름', 'summer'],
    ['봄', 'spring'], ['가을', 'autumn'], ['토요일', 'Saturday'], ['일요일', 'Sunday'], ['금요일', 'Friday'],
    ['수요일', 'Wednesday'], ['목요일', 'Thursday'], ['공부', 'study'], ['운동', 'exercise'], ['음악', 'music'],
    ['축구', 'football'], ['기차', 'train'], ['버스', 'bus'], ['택시', 'taxi'], ['지하철', 'subway'],
    ['우리', 'we; our'], ['누구', 'who'], ['무엇', 'what'], ['그리고', 'and'], ['그래서', 'so'], ['하지만', 'but'],
    ['휴지', 'tissue'], ['휴일', 'holiday'], ['파티', 'party'], ['피아노', 'piano'], ['케이크', 'cake'], ['치즈', 'cheese'],
  ],
  5: [
    ['빵', 'bread'], ['떡볶이', 'spicy rice cakes'], ['있다', 'to be; to have'], ['얘기', 'talk; story'],
    ['예쁘다', 'to be pretty'], ['아빠', 'dad'], ['오빠', 'older brother'], ['쓰다', 'to write; to use'],
    ['싸다', 'to be cheap'], ['비싸다', 'to be expensive'], ['꽃', 'flower'], ['꿈', 'dream'],
    ['깨끗하다', 'to be clean'], ['딸', 'daughter'], ['땅', 'ground'], ['또', 'again'], ['뜨겁다', 'to be hot'],
    ['뿌리', 'root'], ['쌀', 'rice (uncooked)'], ['씨', 'seed; Mr./Ms.'], ['쓰레기', 'rubbish'], ['찌개', 'stew'],
    ['짜장면', 'black-bean noodles'], ['예', 'yes'], ['예약', 'booking'], ['시계', 'clock; watch'], ['세계', 'world'],
    ['계속', 'continuously'], ['차례', 'turn; order'], ['걔', 'that kid'], ['얘', 'this kid'],
    ['있어요', 'there is; I have'], ['맛있어요', "it's tasty"], ['했어요', 'I did'],
  ],
  6: [
    ['과자', 'snack'], ['와', 'wow; and'], ['회사', 'company'], ['뭐', 'what'], ['귀', 'ear'], ['의사', 'doctor'],
    ['사과', 'apple; apology'], ['화장실', 'toilet'], ['영화', 'film'], ['병원', 'hospital'], ['왜', 'why'],
    ['돼지', 'pig'], ['외국', 'abroad'], ['웨이터', 'waiter'], ['위', 'top; above'], ['쉬다', 'to rest'],
    ['의자', 'chair'], ['회의', 'meeting'], ['교과서', 'textbook'], ['대화', 'conversation'], ['전화', 'phone'],
    ['월요일', 'Monday'], ['화요일', 'Tuesday'], ['원', 'won'], ['바뀌다', 'to change'], ['귀엽다', 'to be cute'],
    ['뒤', 'back; behind'], ['취미', 'hobby'], ['가위', 'scissors'], ['더워요', "it's hot"], ['추워요', "it's cold"],
    ['고마워요', 'thanks'], ['죄송합니다', "I'm sorry"],
  ],
  7: [
    ['닭', 'chicken'], ['앉다', 'to sit'], ['많다', 'to be many'], ['읽다', 'to read'], ['없다', 'to not have'],
    ['괜찮아요', "it's okay"], ['삶', 'life'], ['젊다', 'to be young'], ['넓다', 'to be wide'], ['여덟', 'eight'],
    ['싫다', 'to dislike'], ['끊다', 'to cut off'], ['값', 'price'], ['흙', 'soil'], ['굶다', 'to go hungry'],
    ['밟다', 'to step on'], ['짧다', 'to be short'], ['맑다', 'to be clear'], ['늙다', 'to grow old'],
    ['앉아요', 'sit (polite)'], ['많이', 'a lot'], ['없어요', "there isn't"], ['읽어요', 'I read'], ['괜찮다', 'to be okay'],
  ],
  // Everyday words you'll meet constantly, for typing in rhythm once every key is learned.
  8: [
    ['것', 'thing'], ['수', 'way; ability'], ['하다', 'to do'], ['되다', 'to become'], ['그', 'that; he'],
    ['저', 'I (polite)'], ['같다', 'to be the same'], ['알다', 'to know'], ['모르다', 'to not know'],
    ['오다', 'to come'], ['주다', 'to give'], ['받다', 'to receive'], ['말하다', 'to speak'], ['생각', 'thought'],
    ['만나다', 'to meet'], ['살다', 'to live'], ['사다', 'to buy'], ['배우다', 'to learn'], ['가르치다', 'to teach'],
    ['일하다', 'to work'], ['시작', 'start'], ['끝', 'end'], ['지금', 'now'], ['다시', 'again'], ['함께', 'together'],
    ['같이', 'together'], ['아주', 'very'], ['정말', 'really'], ['너무', 'too; so'], ['조금', 'a little'],
    ['잘', 'well'], ['못', "can't"], ['더', 'more'], ['빨리', 'quickly'], ['천천히', 'slowly'], ['항상', 'always'],
    ['자주', 'often'], ['가끔', 'sometimes'], ['이제', 'now'], ['벌써', 'already'], ['아직', 'still; yet'],
    ['먼저', 'first'], ['나중에', 'later'], ['매일', 'every day'], ['오후', 'afternoon'], ['오전', 'morning'],
    ['주말', 'weekend'], ['다음', 'next'], ['처음', 'first time'], ['마지막', 'last'], ['문제', 'problem'],
    ['이유', 'reason'], ['방법', 'way; method'], ['사실', 'fact'], ['세상', 'world'], ['얼굴', 'face'], ['몸', 'body'],
    ['옷', 'clothes'], ['돈', 'money'], ['길', 'road; way'], ['방', 'room'], ['나무', 'tree'], ['동물', 'animal'],
    ['날씨', 'weather'], ['질문', 'question'], ['대답', 'answer'], ['숙제', 'homework'], ['시험', 'exam'],
    ['어디', 'where'], ['언제', 'when'], ['어떻게', 'how'], ['얼마', 'how much'], ['무슨', 'what kind of'],
    ['모든', 'all'], ['다른', 'other'], ['새', 'new; bird'], ['좋은', 'good'],
  ],
};

export interface Word {
  text: string;
  stage: number;
  meaning: string;
}

export const WORDS: Word[] = Object.entries(BY_STAGE).flatMap(([stage, list]) =>
  list.map(([text, meaning]) => ({ text, stage: Number(stage), meaning })),
);

/** Stage 8's everyday words: what word-gap drills lean on. */
export const COMMON_WORDS: ReadonlySet<string> = new Set(WORDS.filter((w) => w.stage === 8).map((w) => w.text));

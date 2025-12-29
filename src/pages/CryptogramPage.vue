<template>
  <q-page class="bg-grey-1 flex column no-wrap overflow-hidden" style="height: calc(100dvh - 48px);">

    <div class="bg-indigo-10 text-white q-pa-sm shadow-2" style="z-index: 10;">
      <div class="row justify-between items-center no-wrap">
        <div class="q-pl-sm">
          <div class="text-subtitle2 text-weight-bolder line-height-1">КРИПТОГРАММА</div>
          <div class="text-caption opacity-70" style="font-size: 10px;">Ant Etkenmen</div>
        </div>
        <div class="row items-center q-gutter-x-md">
           <q-btn flat round dense icon="settings" size="sm" @click="showMenu = true" color="white" />
           <div
            class="row items-center q-gutter-x-sm q-px-md q-py-xs rounded-borders transition-03"
            :class="shieldActive ? 'bg-blue-6' : 'bg-white-transparent'"
           >
            <q-icon
              :name="shieldActive ? 'security' : 'favorite'"
              :color="shieldActive ? 'white' : (errors >= 2 ? 'orange-4' : 'red-4')"
              size="16px"
              :class="{ 'shake-element': isErrorActive }"
            />
            <div class="text-caption text-weight-bold">{{ 3 - errors }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="col scroll q-pa-md flex flex-center content-start">
      <div v-if="!gameStarted" class="column items-center q-gutter-y-md full-width text-center">
        <div class="text-h5 text-weight-bold text-indigo-10">ВЫБЕРИТЕ СЛОЖНОСТЬ</div>
        <div class="column q-gutter-y-sm full-width q-px-xl">
          <q-btn unelevated color="green-6" label="ЛЕГКО (70%)" @click="startGame(0.7)" class="full-width" rounded />
          <q-btn unelevated color="orange-6" label="СРЕДНЕ (50%)" @click="startGame(0.5)" class="full-width" rounded />
          <q-btn unelevated color="red-6" label="СЛОЖНО (20%)" @click="startGame(0.2)" class="full-width" rounded />
        </div>
      </div>

      <div v-else class="row justify-center wrap full-width">
        <div v-for="(word, wIdx) in encodedWords" :key="wIdx" class="word-group row no-wrap q-gutter-x-xs">
          <div v-for="(char, cIdx) in word" :key="cIdx" class="column items-center">
            <template v-if="char.id">
              <div
                class="letter-box"
                :class="{
                  'active-cell': selectedId === char.id && !userSolvedIds.includes(char.id),
                  'is-revealed': revealedIds.includes(char.id),
                  'is-user-solved': userSolvedIds.includes(char.id),
                  'error-cell': isErrorActive && selectedId === char.id
                }"
                @click="onCellClick(char.id)"
              >
                {{ guesses[char.id] || '' }}
              </div>
              <div class="char-id text-weight-bold">
                {{ isSolved(char.id) ? '' : char.id }}
              </div>
            </template>
            <template v-else>
              <div class="punctuation text-weight-medium text-grey-5">{{ char.letter }}</div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="gameStarted && !gameOver" class="row justify-center q-gutter-x-md q-mb-sm">
      <q-btn
        round unelevated
        :color="shieldActive ? 'blue-6' : (boosters.shield > 0 ? 'grey-8' : 'grey-4')"
        icon="security"
        size="sm"
        :disabled="boosters.shield <= 0 || shieldActive"
        @click="useShield"
      >
        <q-badge color="red" floating v-if="boosters.shield > 0">{{ boosters.shield }}</q-badge>
      </q-btn>
      <q-btn
        round unelevated
        :color="boosters.light > 0 ? 'grey-8' : 'grey-4'"
        icon="lightbulb"
        size="sm"
        :disabled="boosters.light <= 0"
        @click="useLight"
      >
        <q-badge color="red" floating v-if="boosters.light > 0">{{ boosters.light }}</q-badge>
      </q-btn>
    </div>

    <div v-if="gameStarted" class="keyboard-container bg-grey-3 q-pa-md border-top">
      <div class="column q-gutter-y-xs">
        <div v-for="(row, rIdx) in keyboardRows" :key="rIdx" class="row no-wrap q-gutter-x-xs justify-center">
          <button
            v-for="key in row"
            :key="key"
            class="key-btn"
            :class="getKeyClass(key)"
            :disabled="isKeyDisabled(key)"
            @click="handleKeyPress(key)"
          >
            {{ key }}
          </button>
        </div>
      </div>
    </div>

    <q-dialog v-model="showMenu">
      <q-card class="q-pa-lg text-center" style="border-radius: 20px; width: 300px">
        <div class="text-h6 q-mb-md">НОВАЯ ИГРА</div>
        <p class="text-caption text-grey-7 q-mb-lg">Текущий прогресс будет потерян</p>
        <q-btn flat label="ОТМЕНА" v-close-popup class="q-mr-sm" />
        <q-btn unelevated color="indigo-10" label="В МЕНЮ" @click="gameStarted = false; showMenu = false" />
      </q-card>
    </q-dialog>

    <q-dialog v-model="gameOver" persistent>
      <q-card class="q-pa-lg text-center shadow-24" style="border-radius: 20px; width: 300px">
        <q-icon :name="status.icon" :color="status.color" size="64px" />
        <div class="text-h5 text-weight-bold q-mt-md" :class="`text-${status.color}`">{{ status.title }}</div>
        <p class="text-body2 q-mt-sm">{{ status.message }}</p>
        <q-btn unelevated rounded color="indigo-10" label="В МЕНЮ" class="full-width q-mt-md" @click="gameStarted = false; gameOver = false" />
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const phrases = [
  "Аякъларыны зияде котерип, бош беллеген ерлерге ихтиятле басып, акъырын-акъырын къапугъа догърулмакъта эди, къарт къадын джан аляметинен къычырды.",
  "Мусафирнинъ къурсагъы ач. Бир парча лаваш, бир чанакъ къатыкъ тапып ашаса, фена олмайджакъ. Лякин къайда? Насыл? Кооператив тюкяны чокътан къапалы. Базар даркъагъан.",
  "Енъи муаллим ичюн шимди энъ муим меселе ятып юкъламакъ. О, шинелини къатлап, башынынъ астына къойды, тёшеме устюне ятты. Башы шинельге тиер-тиймез юкълап къалды.",
  "Мусафирнинъ штанынынъ къырмызы шертлерине джылп-джылп бакъты. Озюне узатылгъан, Маариф комиссарлыгъы кягъытыны элине алгъан сонъ, текрар стол башына кечти. Кягъытны онълы-соллы чевире берип, окъуй башлады.",
  "Стол башында ири кевдели киши, буруныны джарты папка ичине тыкъкъан, нелердир эджелеп окъумакъта. Кишининъ наллы чызмаларынынъ гурьсюльдисинден сескенип, башыны котерди.",
  "Шимди джемаат намаздан чыкъмакъта. Демек, бугунь джума. Ёлджугъа керек бина исе, джамининъ артында. О себептен, къабургъадаки къыйыш аралыкъкъа бурулды.",
  "Мавы къаснакълы шапкасыны чыкъарып, картузы устюне бир уфюрди, текрар башына кийди. Неает, сол билегине асылы шинелининъ этегине узун къонучлы чызмаларыны тез-тез сюртерек, сельбилерге таба кетти.",
  "Къою бензин тютюни даркъагъан сонъ, ёлджу этрафына козь этти. Устюндеки шертли галифеге та узакъта, Темирхан шурадаки къуру ёлда къонгъан тозны эли иле енгильден къакъып, ташлады.",
  "Юк машинасы чешме огюнде токътады. Мыйыгъы сигар тютюнинден сараргъан эсли къумыкъ чёкюрли пармагъыны пенджереден тышары узатып, деренинъ обир якъында, къаршы маалледе, сельбилер алтында пусып тургъан ешиль дамлы эвни косьтерди.",
  "Къартлар муаллимнинъ окъугъаныны дикъкъатле динъледилер. Сонъ озь араларында, не акъкъындадыр, араретли лаф эте башладылар. Лакъырды даргидже дегиль, башкъа тильде эди. Сонъ тонлы къарт мусафирнинъ янына кельди, эли иле аркъасыны таптады.",
  "Дывар янында курсюлер устюнде отургъан къартлар бири-бирлерине бакъыштылар. Отургъанларнынъ эписинден эсли бир адам кевдесини догърултты, сагъ эли иле къанджалынынъ сапыны авучлап, реистен даргидже нелердир сорады. Рейс джевап берген сонъ, къарт еринден къалкъты.",
  "Кимер азбарларнынъ къапулары ачыкъ. Ичериден къоюнлар, бузавлар корюнип къалалар. Аралыкълар башында чызмаларынынъ окчелерине чекелеп, аркъаларыны дываргъа таяп отургъан акъ сакъаллы къартлар Керимовкъа элесленип бакъалар."
]

const keyboardRows = [
  ['Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х'],
  ['Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э'],
  ['Я','Ч','С','М','И','Т','Ь','Б','Ю','Ъ','Ё']
]

const currentPhrase = ref("")
const alphabetMap = reactive({})
const guesses = reactive({})
const revealedIds = ref([])
const userSolvedIds = ref([])
const encodedWords = ref([])
const selectedId = ref(null)
const errors = ref(0)
const gameOver = ref(false)
const win = ref(false)
const gameStarted = ref(false)
const showMenu = ref(false)
const currentDifficulty = ref(0.3)
const isErrorActive = ref(false)

// Бустеры
const boosters = reactive({ shield: 1, light: 2 })
const shieldActive = ref(false)

const isSolved = (id) => revealedIds.value.includes(id) || userSolvedIds.value.includes(id)

const status = computed(() => ({
  title: win.value ? 'МАШАЛЛА!' : 'ОШИБКА',
  message: win.value ? `Вы разгадали цитату!` : 'Попробуйте еще раз!',
  icon: win.value ? 'celebration' : 'error_outline',
  color: win.value ? 'green-7' : 'red-7'
}))

function initCipher(text) {
  Object.keys(alphabetMap).forEach(key => delete alphabetMap[key])
  let idCounter = 1
  for (const char of text.toLowerCase()) {
    if (/[а-яё]/.test(char) && !alphabetMap[char]) {
      alphabetMap[char] = idCounter++
    }
  }
}

function startGame(diff) {
  currentDifficulty.value = diff
  gameStarted.value = true
  boosters.shield = 1
  boosters.light = 2
  shieldActive.value = false
  resetGame()
}

function resetGame() {
  errors.value = 0
  gameOver.value = false
  win.value = false
  userSolvedIds.value = []
  currentPhrase.value = phrases[Math.floor(Math.random() * phrases.length)]
  initCipher(currentPhrase.value)

  const allIds = Object.values(alphabetMap)
  const countToReveal = Math.floor(allIds.length * currentDifficulty.value)
  revealedIds.value = [...allIds].sort(() => 0.5 - Math.random()).slice(0, countToReveal)

  const words = currentPhrase.value.toLowerCase().split(' ')
  encodedWords.value = words.map(word => {
    return word.split('').map(char => {
      const id = alphabetMap[char]
      if (id) {
        guesses[id] = revealedIds.value.includes(id) ? char.toUpperCase() : ''
        return { id, letter: char }
      }
      return { id: null, letter: char }
    })
  })
  selectedId.value = allIds.find(id => !revealedIds.value.includes(id))
}

function handleKeyPress(key) {
  if (!selectedId.value || isSolved(selectedId.value) || gameOver.value) return
  const correctLetter = Object.keys(alphabetMap).find(k => alphabetMap[k] === selectedId.value).toUpperCase()

  if (key === correctLetter) {
    guesses[selectedId.value] = key
    userSolvedIds.value.push(selectedId.value)
    selectedId.value = Object.values(alphabetMap).find(id => !isSolved(id)) || null
    if (!selectedId.value) { win.value = true; gameOver.value = true; }
  } else {
    if (shieldActive.value) {
      shieldActive.value = false; // Поглощаем ошибку
    } else {
      errors.value++
      if (navigator.vibrate) navigator.vibrate(200)
      isErrorActive.value = true
      setTimeout(() => { isErrorActive.value = false }, 400)
      if (errors.value >= 3) { gameOver.value = true; win.value = false; }
    }
  }
}

// Использование бустеров
function useShield() {
  if (boosters.shield > 0 && !shieldActive.value) {
    boosters.shield--
    shieldActive.value = true
  }
}

function useLight() {
  if (boosters.light > 0) {
    const unsolvedIds = Object.values(alphabetMap).filter(id => !isSolved(id))
    if (unsolvedIds.length > 0) {
      boosters.light--
      const randomId = unsolvedIds[Math.floor(Math.random() * unsolvedIds.length)]
      const char = Object.keys(alphabetMap).find(k => alphabetMap[k] === randomId)
      guesses[randomId] = char.toUpperCase()
      userSolvedIds.value.push(randomId)
      if (selectedId.value === randomId) {
        selectedId.value = Object.values(alphabetMap).find(id => !isSolved(id)) || null
      }
      if (!Object.values(alphabetMap).find(id => !isSolved(id))) {
        win.value = true; gameOver.value = true;
      }
    }
  }
}

const onCellClick = (id) => {
  if (!userSolvedIds.value.includes(id) && !revealedIds.value.includes(id)) selectedId.value = id
}

const isKeyDisabled = (key) => {
  const id = alphabetMap[key.toLowerCase()]
  return !id || isSolved(id) || gameOver.value
}

const getKeyClass = (key) => {
  const id = alphabetMap[key.toLowerCase()]
  if (id && revealedIds.value.includes(id)) return 'key-revealed'
  if (id && userSolvedIds.value.includes(id)) return 'key-solved'
  return ''
}
</script>

<style lang="scss" scoped>
.line-height-1 { line-height: 1; }
.white-transparent { background: rgba(255, 255, 255, 0.15); }
.border-top { border-top: 1px solid #d1d5db; }
.transition-03 { transition: all 0.3s ease; }

.word-group {
  display: flex;
  flex-wrap: nowrap;
  margin-bottom: 12px;
  margin-right: 14px;
}

.letter-box {
  width: 22px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  background: white;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  transition: all 0.1s ease;
  color: #1e293b;

  @media (min-width: 400px) {
    width: 26px;
    height: 34px;
    font-size: 1.1rem;
  }

  &.active-cell {
    border-color: #1a237e;
    background: #e8eaf6;
    transform: scale(1.1);
    z-index: 2;
  }

  &.error-cell {
    border-color: #ef4444 !important;
    background: #fee2e2 !important;
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }

  &.is-revealed {
    background: #f1f5f9;
    border-color: transparent;
    color: #64748b;
  }
  &.is-user-solved {
    background: #22c55e;
    border-color: #16a34a;
    color: white;
    animation: bounce 0.4s ease;
  }
}

.shake-element {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}

.char-id {
  font-size: 8px;
  color: #94a3b8;
  margin-top: 1px;
  height: 10px;
}

.punctuation {
  font-size: 1.1rem;
  line-height: 30px;
  min-width: 4px;
  text-align: center;
}

.key-btn {
  flex: 1;
  height: 44px;
  max-width: 42px;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 1px;
  background: white;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 1px 0 #cbd5e1;

  &:active {
    transform: translateY(1px);
    background: #f1f5f9;
    box-shadow: none;
  }

  &.key-solved { background: #22c55e !important; color: white; box-shadow: none; }
  &.key-revealed { background: #cbd5e1 !important; color: #64748b; box-shadow: none; }
  &:disabled:not(.key-solved):not(.key-revealed) { opacity: 0.4; background: #e2e8f0; }
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>

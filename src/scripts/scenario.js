export const REACTIONS = {
  positive: [
    "Именно так! 👍", 
    "Perfect! У тебя отлично получается.", 
    "В точку! Двигаемся дальше?", 
    "Абсолютно верно. Keep it up!"
  ],
  negative: [
    "Почти, но не совсем. Попробуй еще раз!", 
    "Хмм, что-то не сходитcя. Посмотри на порядок слов.", 
    "Не совсем так. Давай дадим этому еще один шанс."
  ]
};

export const scenario = [
  {
    botSay: "Привет! Собери фразу: 'I really love pizza.'",
    expected: "I really love pizza.",
    hint: "Используй 'really' перед глаголом.",
    tokens: [
      { 
        id: 1, text: 'I', type: 'standard', 
        leftConn: null, rightConn: 1 // Сплошная линия
      },
      { 
        id: 2, text: 'really', type: 'mystery', hidden: true, 
        leftConn: 1, rightConn: 2 // Вход: сплошная, Выход: располовиненная
      }, 
      { 
        id: 3, text: 'love', original: 'love', opposite: 'hate', type: 'mirror',
        leftConn: 2, rightConn: 3 // Вход: располовиненная, Выход: две точки
      }, 
      { 
        id: 4, text: 'pizzas', type: 'transformer',
        forms: ['pizza', 'pizzas', 'PIZZA!'], 
        connCycle: [
          [3, 2], // pizza -> три точки
          [3, 1], // pizzas -> сплошная
          [2, 3]  // PIZZA! -> располовиненная
        ],
        leftConn: 3, 
        rightConn: 1 
      }, 
      { 
        id: 5, text: '.', static: true, 
        leftConn: 2, rightConn: null 
      }
    ]
  },
  {
    botSay: "Good job! Теперь скажем: 'I am learning code.'",
    expected: "I am learning code.",
    tokens: [
      { id: 8, text: 'I', leftConn: null, rightConn: 1 }, // Сплошная
      { 
        id: 9, text: 'is', type: 'transformer',
        forms: ['is', 'am', 'are'], 
        connCycle: [
          [1, 3], // is -> не подходит (две точки)
          [1, 2], // am -> подходит (располовиненная)
          [1, 4]  // are -> не подходит (три точки)
        ],
        leftConn: 1, 
        rightConn: 3 
      },
      { id: 10, text: 'learning', leftConn: 2, rightConn: 3 }, // Вход: располовиненная
      { id: 11, text: 'code', leftConn: 3, rightConn: 2 },     // Вход: две точки
      { id: 12, text: '.', static: true, leftConn: 2, rightConn: null } // Вход: три точки
    ]
  },
  {
    botSay: "А теперь: 'This app is amazing!'",
    expected: "This app is amazing!",
    tokens: [
      { id: 13, text: 'This', leftConn: null, rightConn: 4 }, // Три точки
      { id: 14, text: 'app', leftConn: 4, rightConn: 2 },     // Располовиненная
      { id: 15, text: 'is', leftConn: 2, rightConn: 1 },      // Сплошная
      { 
        id: 16, text: 'amazing', type: 'transformer',
        forms: ['good', 'cool', 'amazing'], 
        connCycle: [
          [1, 2], // good -> не подходит
          [1, 4], // cool -> не подходит
          [1, 3]  // amazing -> подходит (две точки)
        ],
        leftConn: 1, 
        rightConn: 2 
      },
      { id: 17, text: '!', static: true, leftConn: 3, rightConn: null } // Ожидает две точки
    ]
  }
];
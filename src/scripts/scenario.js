// ./scripts/scenario.js

export const REACTIONS = {
    positive: [
      "Именно так! 👍", 
      "Perfect! У тебя отлично получается.", 
      "В точку! Двигаемся дальше?", 
      "Абсолютно верно. Keep it up!"
    ],
    negative: [
      "Почти, но не совсем. Попробуй еще раз!", 
      "Хмм, что-то не сходится. Посмотри на порядок слов.", 
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
          leftConn: 0, rightConn: 1 
        },
        { 
          id: 2, text: 'really', type: 'mystery', hidden: true, 
          leftConn: 1, rightConn: 2 
        }, 
        { 
          id: 3, text: 'love', original: 'love', opposite: 'hate', type: 'mirror',
          leftConn: 2, rightConn: 3 
        }, 
        { 
          id: 4, text: 'pizza', type: 'transformer',
          forms: ['pizza', 'pizzas', 'PIZZA!'], 
          // Пример парных коннекторов [L, R]
          connCycle: [
            [3, 4], // pizza
            [3, 5], // pizzas
            [3, 6]  // PIZZA!
          ],
          leftConn: 3, 
          rightConn: 4 
        }, 
        { 
          id: 5, text: '.', static: true, 
          leftConn: 4, rightConn: 0 
        }
      ]
    },
    {
      botSay: "Good job! Теперь скажем: 'I am learning code.'",
      expected: "I am learning code.",
      tokens: [
        { id: 8, text: 'I', leftConn: 0, rightConn: 1 },
        { 
          id: 9, text: 'is', type: 'transformer',
          forms: ['is', 'am', 'are'], 
          connCycle: [[1, 5], [1, 2], [1, 5]], // Только 'am' даст выход 2
          leftConn: 1, 
          rightConn: 5 
        },
        { id: 10, text: 'learning', leftConn: 2, rightConn: 3 },
        { id: 11, text: 'code', leftConn: 3, rightConn: 4 },
        { id: 12, text: '.', static: true, leftConn: 4, rightConn: 0 }
      ]
    },
    {
      botSay: "А теперь: 'This app is amazing!'",
      expected: "This app is amazing!",
      tokens: [
        { id: 13, text: 'This', leftConn: 0, rightConn: 1 },
        { id: 14, text: 'app', leftConn: 1, rightConn: 2 },
        { id: 15, text: 'is', leftConn: 2, rightConn: 3 },
        { 
          id: 16, text: 'amazing', type: 'transformer',
          forms: ['good', 'cool', 'amazing'], 
          connCycle: [[3, 5], [3, 5], [3, 4]], // Только 'amazing' даст выход 4 для знака '!'
          leftConn: 3, 
          rightConn: 5 
        },
        { id: 17, text: '!', static: true, leftConn: 4, rightConn: 0 }
      ]
    }
  ];
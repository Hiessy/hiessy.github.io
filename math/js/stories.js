// --- VISUAL STORIES ---
//
// HOW TO CREATE A NEW STORY:
// 1. Copy the "astronaut" object below and give it a new key (e.g. "dinosaur").
// 2. Write your steps: each step is { icon, en, es } — one emoji and a short
//    caption in English and Spanish. Use around 30 steps.
// 3. pointsPerStep controls pacing: the story advances one step every N points.
//    (30 steps × 5 points = the story ends right at the 150-point Legend rank.)
// 4. Switch the active story by changing ACTIVE_STORY at the bottom.
//
const STORIES = {
    astronaut: {
        pointsPerStep: 5,
        steps: [
            { icon: "🧑‍🚀", en: "Alex the astronaut wakes up. Today is training day!", es: "¡El astronauta Alex despierta. Hoy toca entrenar!" },
            { icon: "🏃", en: "Morning run around the academy.", es: "Carrera matutina por la academia." },
            { icon: "🏋️", en: "Getting strong for the big mission.", es: "Se pone fuerte para la gran misión." },
            { icon: "🌀", en: "Whoa! The spinning chair test!", es: "¡Uy! ¡La prueba de la silla giratoria!" },
            { icon: "📚", en: "Studying maps of the stars.", es: "Estudiando mapas de las estrellas." },
            { icon: "🎓", en: "Training complete. Ready for space!", es: "Entrenamiento completo. ¡Listo para el espacio!" },
            { icon: "🧤", en: "Putting on the space suit, piece by piece.", es: "Se pone el traje espacial, pieza por pieza." },
            { icon: "🚌", en: "Riding the bus to the launch pad.", es: "En el autobús hacia la plataforma de despegue." },
            { icon: "🚀", en: "There it is... the mighty rocket!", es: "Ahí está... ¡el gran cohete!" },
            { icon: "🪜", en: "Climbing up, up, up into the rocket.", es: "Subiendo, subiendo hasta entrar al cohete." },
            { icon: "🎛️", en: "Checking all the buttons and controls.", es: "Revisando todos los botones y controles." },
            { icon: "🔢", en: "Countdown! 5... 4... 3... 2... 1...", es: "¡Cuenta regresiva! 5... 4... 3... 2... 1..." },
            { icon: "🔥", en: "IGNITION! The engines roar!", es: "¡IGNICIÓN! ¡Los motores rugen!" },
            { icon: "🛫", en: "LIFTOFF! We have liftoff!", es: "¡DESPEGUE! ¡Estamos volando!" },
            { icon: "🌍", en: "Earth gets smaller and smaller below.", es: "La Tierra se ve cada vez más pequeña." },
            { icon: "🌌", en: "Entering deep, dark, beautiful space.", es: "Entrando al espacio profundo y hermoso." },
            { icon: "⭐", en: "Flying past millions of twinkling stars.", es: "Volando entre millones de estrellas brillantes." },
            { icon: "☄️", en: "Look out! Dodging a speedy comet!", es: "¡Cuidado! ¡Esquivando un cometa veloz!" },
            { icon: "🛰️", en: "Waving hello to a friendly satellite.", es: "Saludando a un satélite amigable." },
            { icon: "🌠", en: "A shooting star! Make a wish!", es: "¡Una estrella fugaz! ¡Pide un deseo!" },
            { icon: "🪐", en: "A strange ringed planet appears ahead...", es: "Un extraño planeta con anillos aparece..." },
            { icon: "🌗", en: "Landing softly on a mysterious moon.", es: "Aterrizando suave en una luna misteriosa." },
            { icon: "👣", en: "First steps on brand new ground!", es: "¡Primeros pasos en un suelo nuevo!" },
            { icon: "🔍", en: "Exploring caves full of glowing rocks.", es: "Explorando cuevas con rocas que brillan." },
            { icon: "👽", en: "A friendly alien says hello!", es: "¡Un alien amigable lo saluda!" },
            { icon: "💎", en: "Wow! A shiny space crystal to take home.", es: "¡Guau! Un cristal espacial para llevar a casa." },
            { icon: "🚀", en: "Back to the rocket. Time to go home.", es: "De vuelta al cohete. Hora de volver a casa." },
            { icon: "🌍", en: "There's Earth! Almost home now.", es: "¡Ahí está la Tierra! Ya casi en casa." },
            { icon: "🪂", en: "Gliding down through the clouds...", es: "Bajando suavemente entre las nubes..." },
            { icon: "🏅", en: "HOME! A hero's welcome! Mission complete!", es: "¡EN CASA! ¡Bienvenida de héroe! ¡Misión cumplida!" }
        ]
    }
};

// Change this to point at any story in STORIES
const ACTIVE_STORY = STORIES.astronaut;

import { Match, first, pipe, from, run, match, if as _if, best, defaultDisambiguator, re, NamedActions, tap } from '../src/prague';

// _if looks for a truthy result and doesn't capture any matches
const askTime = _if(
    (t: string) => t === "time", 
    () => () => console.log(`The time is ${new Date().toLocaleDateString()}`),
);

// const askTime = (t: string) => {
//     if (t === "time")
//       return () => console.log(`The time is ${new Date().toLocaleDateString()}`);
//   }
  

const giveName = pipe(
    first(
        re(/My name is (.*)/),
        re(/Je m'appelle (.*)/),
    ),
    r => r instanceof Match ? r.value[1] : r,
); 

const sayGoodbye = first(
    re(/farewell/i),
    re(/adios/i),
    re(/bye/i),
);

const introduction = match(
    giveName,
    r => () => console.log(`Nice to meet you, ${r.value}`),
);

const app = pipe(
    first(
        askTime,
        introduction,
        t => () => console.log(`I don't understand "${t}"`),
    ),
);

const greetings = [
    "My name is Bill",
    "Je m'appelle Bill",
    "time",
    "I'm Bill",
];

greetings.map(t => pipe(
        app,
        run,
    )(t)
    .subscribe()
)

console.log("*** Scoring ***");

pipe(
    best(
        () => new Match("bill", .85),
        () => new Match("fred", .50),
        () => new Match("joe", .85),
    ),
    defaultDisambiguator,
)()
.subscribe(console.log)

console.log("*** Named Actions ***");

const actions = new NamedActions((send: (...args: any[]) => void) => ({
    greeting(name: string) {
        send(`Nice to meet you, ${name}`);
        return Promise.resolve();
    },
    farewell() {
        send(`Goodbye`);
    },
}));

const intro = match(
    giveName,
    r => actions.for.greeting(r.value),
);

const outro = match(
    sayGoodbye,
    () => actions.for.farewell(),
)

const namedActionApp = pipe(
    first(
        intro,
        outro,
    ),
    actions.toAction(console.log),
    run,
);

["bye bye"].map(t => app2(t)
    .subscribe()
);
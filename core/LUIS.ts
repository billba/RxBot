import { Observable } from 'rxjs';
import { ITextMatch } from './Text';
import { konsole } from './Konsole';
import { IRule, RuleResult, BaseRule, SimpleRule, Matcher, Handler, Match, Observableable, toFilteredObservable, ruleize } from './Rules';
import 'isomorphic-fetch';

// a temporary model for LUIS built from my imagination because I was offline at the time

export interface LuisIntent {
    intent: string;
    score: number;
}

export interface LuisEntity {
    entity: string;
    type: string;
    startIndex: number;
    endIndex: number;
    score: number;
}

export interface LuisResponse {
    query: string;
    topScoringIntent?: LuisIntent;
    intents?: LuisIntent[];
    entities?: LuisEntity[];
}

interface LuisCache {
    [utterance: string]: LuisResponse;
}

export interface ILuisMatch {
    entities: LuisEntity[],
    findEntity: (type: string) => LuisEntity[],
    entityValues: (type: string) => string[]    
}

export interface LuisRules<M> {
    [intent: string] : Handler<M & ILuisMatch> | IRule<M & ILuisMatch>
}

interface TestData {
    [utterance: string]: LuisResponse;
}

const entityFields = (entities: LuisEntity[]): ILuisMatch => ({
    entities: entities,
    findEntity: (type: string) => LuisModel.findEntity(entities, type),
    entityValues: (type: string) => LuisModel.entityValues(entities, type),
})                

export class LuisModel {
    private cache: LuisCache = {};
    private url: string;

    constructor(id: string, key: string, private scoreThreshold = 0.5) {
        this.url = 
            id === 'id' && key === 'key' ? 'testData' :
            `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${id}?subscription-key=${key}&q=`;
    }

    private testData: TestData = {
        "Wagon Wheel": {
            query: "Wagon Wheel",
            topScoringIntent: {
                intent: 'singASong',
                score: .95,
            },
            intents: [{
                intent: 'singASong',
                score: .95,
            }, {
                intent: 'findSomething',
                score: .30,
            }, {
                intent: 'bestPerson',
                score: .05
            }],
            entities: [{
                entity: 'Wagon Wheel',
                type: "song",
                startIndex: 0,
                endIndex: 11,
                score: .95
            }, {
                entity: 'Pub',
                type: "what",
                startIndex: 0,
                endIndex: 3,
                score: .89
            }, {
                entity: 'London',
                type: "where",
                startIndex: 0,
                endIndex: 6,
                score: .72
            }]
        },

        "Pubs in London": {
            query: "Pubs in London",
            topScoringIntent: {
                intent: 'findSomething',
                score: .90,
            },
            intents: [{
                intent: 'findSomething',
                score: .90,
            }, {
                intent: 'singASong',
                score: .51,
            }, {
                intent: 'bestPerson',
                score: .05
            }],
            entities: [{
                entity: 'Pub',
                type: "what",
                startIndex: 0,
                endIndex: 3,
                score: .89
            }, {
                entity: 'London',
                type: "where",
                startIndex: 0,
                endIndex: 6,
                score: .72
            }, {
                entity: 'Wagon Wheel',
                type: "song",
                startIndex: 0,
                endIndex: 11,
                score: .35
            }]
        }
    }

    public call(utterance: string): Observable<LuisResponse> {
        konsole.log("calling LUIS");
        const response = this.cache[utterance];
        if (response)
            return Observable.of(response).do(_ => konsole.log("from cache!!"));
        if (this.url === 'testData') {
            const luisResponse = this.testData[utterance];
            if (!luisResponse)
                return Observable.empty();
            return Observable.of(luisResponse)
                .do(luisResponse => konsole.log("LUIS test data!", luisResponse))
                .do(luisResponse => this.cache[utterance] = luisResponse);
        }
        return Observable.fromPromise(fetch(this.url + utterance).then<LuisResponse>(response => response.json()))
            .do(luisResponse => {
                konsole.log("LUIS response!", luisResponse);
                this.cache[utterance] = luisResponse;
            });
    }

    public match<M extends ITextMatch = any>(match: M) {
        return this.call(match.text)
            .filter(luisResponse => luisResponse.topScoringIntent.score >= this.scoreThreshold)
            .map(luisResponse => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                luisResponse: {
                    ... luisResponse,
                    intents: (luisResponse.intents || luisResponse.topScoringIntent && [luisResponse.topScoringIntent])
                        .filter(luisIntent => luisIntent.score >= this.scoreThreshold)
                }
            } as M & { luisResponse: LuisResponse}));
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the rule matching the *highest-ranked intent* will be executed
    // Note that:
    //      luis.best(
    //          luis.rule('intent1', handler1),
    //          luis.rule('intent2', handler2)
    //      )
    // is just a more efficient (and concise) version of:
    //      Rule.first(
    //          new Rule(luis.model(), luis.intent('intent1'), handler1)),
    //          new Rule(luis.model(), luis.intent('intent2'), handler2))
    //      )
    // or:
    //      Rule.first(
    //          luis.rule('intent1', handler1),
    //          luis.rule('intent2', handler2)
    //      ).prependMatcher(luis.model())

    best<M extends Match & ITextMatch = any>(luisRules: LuisRules<M>): IRule<M> {
        return new BestMatchingLuisRule<M>(match => this.match(match), luisRules);
    }

    static findEntity(entities: LuisEntity[], type: string) {
        return entities
        .filter(entity => entity.type === type);
    }

    static entityValues(entities: LuisEntity[], type: string) {
        return this.findEntity(entities, type)
        .map(entity => entity.entity);
    }

}

class BestMatchingLuisRule<M extends Match & ITextMatch> extends BaseRule<M> {
    constructor(
        private matchModel: Matcher<M, M & { luisResponse: LuisResponse }>,
        private luisRules: LuisRules<M>
    ) {
        super();
    }

    tryMatch(match: M): Observable<RuleResult> {
        return toFilteredObservable(this.matchModel(match))
            .flatMap(m =>
                Observable.from(m.luisResponse.intents)
                .flatMap(
                    luisIntent =>
                        Observable.of(this.luisRules[luisIntent.intent])
                        .filter(rule => !!rule)
                        .flatMap(rule =>
                            ruleize(rule).tryMatch({
                                ... match as any,
                                score: luisIntent.score,
                                ... entityFields(m.luisResponse.entities),
                                })
                        ),
                    1
                )
                .take(1) // stop with first intent that appears in the rules
            )
    }
}

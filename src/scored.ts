import { Transform, pipe, multiple } from './prague';

/**
 * Wraps a result with its numeric score
 */

export class Scored <
    RESULT,
> {
    private constructor(
        public result: RESULT,
        public score = 1,
    ) {
    }

    private static normalizedScore (
        score?: number,
    ) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    /**
     * Attempts to create a Scored
     * @param result The result on which the resultant Scored will be based
     * @param score The score (> 0 and <= 1)
     * @returns An instance of Scored, or null if result is null or undefined, or score is 0
     */

    static from (
        result: undefined | null,
        score?: number,
    ): null;
    
    static from (
        result: any,
        score: 0,
    ): null;
    
    static from <
        O,
    >(
        result: Scored<O> | O,
        score?: number,
    ): Scored<O>;

    static from (
        result: any,
        score?: number
    ) {
        if (result == null || score === 0)
            return null;

        if (result instanceof Scored) {
            if (score === undefined)
                return result;

            score = Scored.normalizedScore(score);

            return score === result.score
                ? result
                : new Scored(result.result, score);
        }

        return new Scored(result, Scored.normalizedScore(score));
    }

    /**
     * Unwraps a Scored object
     * @param result The Scored object to unwrap (or any other result)
     * @returns The Scored result, or result if its not a Scored
     */

    static unwrap <
        RESULT,
    >(
        result: Scored<RESULT> | RESULT,
    ) {
        return result instanceof Scored
            ? result.result
            : result;
    }
}

/**
 * A Transform which returns its argument, sorted
 * @param ascending true to sort ascending, false (or omit) to sort descending
 * @returns its argument if not an array, otherwise a sorted version of the argument
 */

export const sort = <O> (
    ascending = false,
) => ((o: O) => Promise.resolve(Array.isArray(o)
    ? o
        .map(result => Scored.from(result))
        .sort((a, b) => ascending ? (a.score - b.score) : (b.score - a.score))
    : o
)) as Transform<[O], Scored<any> | Scored<any>[]>;

export interface TopOptions {
    maxResults?: number;
    tolerance?: number;
}

/**
 * A Transform which returns the highest scoring elements of the argument
 * @param options maxResults and/or tolerance
 * @returns a new Transform which the highest scoring elements as an array or results, a single result, or null, as appropriate.
 */

export function top <
    RESULT,
> (
    options?: TopOptions,
): Transform<[RESULT], any> {

    let maxResults = Number.POSITIVE_INFINITY;
    let tolerance  = 0;

    if (options) {
        if (options.maxResults) {
            if (typeof options.maxResults !== 'number' || options.maxResults < 1)
                throw new Error ("maxResults must be a number >= 1");

            maxResults = options.maxResults;
        }
        
        if (options.tolerance) {
            if (typeof options.tolerance !== 'number' || options.tolerance < 0 || options.tolerance > 1)
                throw new Error ("tolerance must be a number >= 0 and <= 1");

            tolerance  = options.tolerance;
        }
    }

    return (async (result: RESULT) => {
        if (!Array.isArray(result))
            return result;

        let top: Scored<any>[] = [];

        for (const _result of result) {
            if (!(_result instanceof Scored))
                throw "top must only be called on Array of Scored";

            if (top.length >= maxResults || _result.score + tolerance < result[0].score)
                break;
            
            top.push(_result);
        }

        return top.length === 1 ? top[0] : top;
    }) as Transform<[RESULT], RESULT | Scored<any> | Scored<any>[]>;
}

/**
 * Composes multiple functions into a new Transform which returns the highest-scoring result of the functions
 * @param transforms the functions to run, each of which should return a Scored result or an array of Scored results
 * @returns a new Transform which returns the unwrapped highest-scoring result of the functions
 */

export function best <
    ARGS extends any[],
> (
    ...transforms: ((...args: ARGS) => any)[]
) {
    return pipe(
        multiple(...transforms),
        sort(),
        top({
            maxResults: 1,
        }),
        Scored.unwrap,
    );
}

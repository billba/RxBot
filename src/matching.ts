import { Returns, pipe, toPromise, promiseOfNull } from './prague';

/**
 * Composes two functions into a new transform which chooses which function to run based on the argument.
 * @param onResult the function to run if the argument is non-null.
 * @param onNull the function to run if the argument is null. If omitted, null is returned.
 * @returns A new transform which returns either the result of onResult or the result of onNull
 */

export const branch = <
    O,
    ONRESULT,
    ONNULL = null,
> (
    onResult: (result: NonNullable<O>) => Returns<ONRESULT>,
    onNull?: () => Returns<ONNULL>,
) => (o: O) => (
    o == null
        ? onNull ? toPromise(onNull()) : promiseOfNull
        : toPromise(onResult(o as NonNullable<O>))
) as Promise<ONRESULT | ONNULL>;

/**
 * Composes three functions into a new transform. The first determines which of the other two to run.
 * @param matcher the function to run to determine whether to run onResult or onNull
 * @param onResult the function to run if the result of matcher is non-null.
 * @param onNull the function to run if the result of matcher is null. If omitted, null is returned.
 * @returns A new transform which returns either the result of onResult or the result of onNull
 */

export const match = <
    ARGS extends any[],
    O,
    ONRESULT,
    ONNULL = null,
> (
    matcher: (...args: ARGS) => Returns<O>,
    onResult: (result: NonNullable<O>) => Returns<ONRESULT>,
    onNull?: () => Returns<ONNULL>,
) => pipe(
    matcher,
    branch(onResult, onNull),
);

/**
 * Wraps a predicate into a new transform which returns true or null.
 * @param predicate the function to run to determine whether to return true or null.
 * @returns a new transform which returns true or null
 */

export const toPredicate = <
    ARGS extends any[],
> (
    predicate: (...args: ARGS) => any,
) => pipe(
    predicate,
    o => o ? true : null,
);

/**
 * Wraps a predicate into a new transform which decides whether a pipe chain should continue.
 * @param predicate the function to run to determine whether to continue in a pipe chain.
 * @returns a new transform which returns true or null
 */

export const onlyContinueIf = toPredicate;

/**
 * Composes three functions into a new transform. The first determines which of the other two to run.
 * @param predicate the function to run to determine whether to run onResult or onNull.
 * @param onTruthy the function to run if the result of predicate is truthy.
 * @param onFalsey the function to run if the result of predicate is falsey. If omitted, returns null.
 * @returns A new transform which returns either the result of onTruthy or the result of onFalsey.
 */

export const matchIf = <
    ARGS extends any[],
    ONTRUTHY,
    ONFALSEY = null,
> (
    predicate: (...args: ARGS) => any,
    onTruthy: () => Returns<ONTRUTHY>,
    onFalsey?: () => Returns<ONFALSEY>,
) => pipe(
    toPredicate(predicate),
    branch(onTruthy, onFalsey),
);

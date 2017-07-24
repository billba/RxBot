import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable<T> = T | Observable<T> | Promise<T>;

export interface Route {
    score?: number;
    action: () => Observableable<any>;
}

export interface IRouter<M extends object = any> {
    getRoute(message: M): Observable<Route>;
}

export type Matcher<A extends object = any, Z extends object = any> = (message: A) => Observableable<Z>;

export type Handler<Z extends object = any> = (message: Z) => Observableable<any>;

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const toFilteredObservable = <T>(t: Observableable<T>) => {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t).filter(i => !!i);
    return Observable.of(t);
}

export const toObservable = <T>(t: Observableable<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t);
    return Observable.of(t);
}

export function isRouter<M extends object = any>(r: IRouter<M> | Handler<M>): r is IRouter<M> {
    return ((r as any).getRoute !== undefined);
}

export const routerize = <M extends object = any>(r: IRouter<M> | Handler<M>) => {
    return isRouter(r) ? r : simpleRouter(r);
}

export const matchize = <M extends object = any>(matcher: Matcher<M>, message: M) => {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    return toFilteredObservable(matcher(message))
        .map(m => typeof m === 'boolean' ? message : m);
}

export const routeMessage = <M extends object = any>(router: IRouter<M>, message: M) => 
    router.getRoute(message)
        .do(route => konsole.log("handle: matched a route", route))
        .flatMap(route => toObservable(route.action()))
        .do(_ => konsole.log("handle: called action"));

export function combineMatchers<M extends object = any, N extends object = any>(m1: Matcher<M, N>): Matcher<M, N>
export function combineMatchers<M extends object = any, N extends object = any, O extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>): Matcher<M, O>
export function combineMatchers<M extends object = any, N extends object = any, O extends object = any, P extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>): Matcher<M, P>
export function combineMatchers<M extends object = any, N extends object = any, O extends object = any, P extends object = any, Q extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>, m4: Matcher<P, Q>): Matcher<M, Q>
export function combineMatchers<M extends object = any>(... matchers: Matcher[]): Matcher<M, any>
export function combineMatchers<M extends object = any>(... args: Matcher[]): Matcher<M, any> {
    konsole.log("combineMatchers", args);
    return message =>
        Observable.from(args)
        .reduce<Matcher, Observable<any>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    konsole.log(`calling matcher #${i}`, currentMatcher);
                    return matchize(currentMatcher, prevMatch)
                        .do(result => konsole.log("result", result));
                }),
            Observable.of(message)
        );
}

export const simpleRouter = <M extends object = any>(handler: Handler<M>) => ({
    getRoute: (message: M) => Observable.of({
        action: () => handler(message)
    } as Route)
}) as IRouter<M>;

const filteredRouter$ = <M extends object = any>(... routers: (IRouter<M> | Handler<M>)[]) =>
    Observable.from(routers)
        .filter(router => !!router)
        .map(router => routerize(router));

export const first = <M extends object = any>(... routers: (IRouter<M> | Handler<M>)[]) => {
    const router = filteredRouter$(... routers);

    return {
        getRoute: (message: M) =>
            router.flatMap(
                (router, i) => {
                    konsole.log(`first: trying router #${i}`);
                    return router.getRoute(message)
                        .do(m => konsole.log(`first: router #${i} succeeded`, m));
                },
                1
            )
            .take(1) // so that we don't keep going through routers after we find one that matches
    } as IRouter<M>;
}

const minRoute: Route = {
    score: 0,
    action: () => console.log("This should never be called")
}

export const best = <M extends object = any>(... routers: (IRouter<M> | Handler<M>)[]) => {
    const router = filteredRouter$(... routers);

    return {
        getRoute: (message: M) =>
            router.flatMap(
                (router, i) => {
                    konsole.log(`best: trying router #${i}`);
                    return router.getRoute(message)
                        .do(m => konsole.log(`best: router #${i} succeeded`, m));
                }
            )
            .reduce(
                (prev, current) => Math.min(prev.score === undefined ? 1 : prev.score) > Math.min(current.score === undefined ? 1 : current.score) ? prev : current,
                minRoute
            )
    } as IRouter<M>;
}

export const prependMatcher = <L extends object = any, M extends object = any>(matcher: Matcher<L, M>, router: IRouter<M>) => ({
    getRoute: (message: L) =>
        matchize(matcher, message)
            .flatMap((m: M) => router.getRoute(m))
    } as IRouter<L>);

export const run = <M extends object = any>(handler: Handler<M>) => ({
    getRoute: (message: M) =>
        toObservable(handler(message))
        .map(_ => null)
    } as IRouter<M>);

export interface Predicate<M extends object = any> {
    (message: M): Observableable<boolean>;
}

export function ifMatch<M extends object = any>(handler: Handler<M> | IRouter<M>): IRouter<M>

export function ifMatch<M extends object = any>(p1: Predicate<M>, handler: Handler<M> | IRouter<M>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function ifMatch<M extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, O extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function ifMatch<M extends object = any>(... args: (Predicate | Matcher | Handler | IRouter)[]): IRouter<M> {
    const router = routerize(args[args.length - 1] as Handler | IRouter);
    switch (args.length) {
        case 1:
            return router;
        case 2:
            return prependMatcher(args[0] as Matcher, router);
        default:
            return prependMatcher(combineMatchers(... args.slice(0, args.length - 1) as Matcher[]), router);
    }
}

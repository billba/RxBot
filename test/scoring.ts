import { describe, expect, passErr, throwErr } from './common';
import { Match, sorted, Multiple, pipe, top, best, emitNoResult} from '../src/prague';

const matches = [
    new Match("hello", .75),
    new Match("hi", .5),
];

const spreadme = [
    new Match("aloha", .65),
    new Match("wassup", .3),
];

const spreaded = [
    matches[0],
    spreadme[0],
    matches[1],
    spreadme[1],
]

describe("sorted", () => {
    it("should pass through a single result", (done) => {
        const m = new Match("hello", .5);

        emitNoResult(
            sorted(
                () => m,
            )
        )().subscribe(_m => {
            expect(_m).equals(m);
        }, passErr, done);
    });

    it("should not emit for null router", (done) => {
        sorted(
            () => null,
        )().subscribe(throwErr, passErr, done);
    });

    it("should return Multiple for multiple results", (done) => {
        emitNoResult(
            sorted(
                ...matches.map(m => () => m)
            )
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for sorted results", (done) => {
        emitNoResult(
            sorted(
                ...matches.map(m => () => m)
            )
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for unsorted results", (done) => {
        emitNoResult(
            sorted(
                ...matches.reverse().map(m => () => m)
            )
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches.reverse())
        }, passErr, done);
    });

    it("should spread and sort Multiples", (done) => {
        emitNoResult(
            sorted(
                () => matches[0],
                () => new Multiple(spreadme),
                () => matches[1],
            )
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals([
                matches[0],
                spreadme[0],
                matches[1],
                spreadme[1],
            ])
        }, passErr, done);
    });
});

describe("top", () => {
    it("should default to quantity infinity, tolerance 0", done => {
        emitNoResult(
            pipe(
                () => new Multiple([
                    new Match("hi", .5),
                    new Match("hello", .5),
                    new Match("aloha", .5),
                    new Match("wassup", .3),
                ]),
                top(),
            )
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(3);
        }, passErr, done);
    });

    it("should return one item when maxLength == 2 but tolerance is zero", done => {
        emitNoResult(
            pipe(
                () => new Multiple(spreaded),
                top({
                    maxResults: 2,
                }),
            )
        )().subscribe(m => {
            expect(m).not.instanceof(Multiple);
            expect(m).equals(matches[0]);
        }, passErr, done);
    });

    it("should return two items when maxLength == 2 but tolerance is .1", done => {
        emitNoResult(
            pipe(
                () => new Multiple(spreaded),
                top({
                    maxResults: 2,
                    tolerance: .1,
                }),
            )
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(2);
            expect((m as Multiple).results[0]).equals(spreaded[0]);
            expect((m as Multiple).results[1]).equals(spreaded[1]);
        }, passErr, done);
    });

    it("should return all items when tolerance is 1", done => {
        emitNoResult(
            pipe(
                () => new Multiple(spreaded),
                top({
                    tolerance: 1,
                }),
            )
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(4);
            expect((m as Multiple).results).deep.equals(spreaded);
        }, passErr, done);
    });
});

describe("best", () => {
    it("should return the top 1 item", done => {
        emitNoResult(
            best(
                () => matches[0],
                () => new Multiple(spreadme),
                () => matches[1],
            )
        )()
        .subscribe(m => {
            expect(m).instanceof(Match);
            expect(m).equals(matches[0]);
        }, passErr, done);
    })
});
import { describe, expect, passErr } from './common';
import { Match, sorted, Multiple, pipe, top, best} from '../src/prague';

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
        sorted(
            () => m,
        )().subscribe(_m => {
            expect(_m).to.eql(m);
        }, passErr, done);
    });

    it("should return undefined for null router", (done) => {
        sorted(
            () => null,
        )().subscribe(_m => {
            expect(_m).to.be.undefined;
        }, passErr, done);
    });

    it("should return Multiple for multiple results", (done) => {
        sorted(
            ...matches.map(m => () => m)
        )().subscribe(_m => {
            expect(_m instanceof Multiple).to.be.true;
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for sorted results", (done) => {
        sorted(
            ...matches.map(m => () => m)
        )().subscribe(_m => {
            expect(_m instanceof Multiple).to.be.true;
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for unsorted results", (done) => {
        sorted(
            ...matches.reverse().map(m => () => m)
        )().subscribe(_m => {
            expect(_m instanceof Multiple).to.be.true;
            expect((_m as Multiple).results).deep.equals(matches.reverse())
        }, passErr, done);
    });

    it("should spread and sort Multiples", (done) => {
        sorted(
            () => matches[0],
            () => new Multiple(spreadme),
            () => matches[1],
        )().subscribe(_m => {
            expect(_m instanceof Multiple).to.be.true;
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
        pipe(
            () => new Multiple(spreaded),
            top(),
        )().subscribe(m => {
            expect(m instanceof Multiple).is.false;
            expect(m).equals(spreaded[0]);
        }, passErr, done);
    });

    it("should return one item when maxLength == 2 but tolerance is zero", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                maxResults: 2,
            })
        )().subscribe(m => {
            expect(m instanceof Multiple).to.be.false;
            expect(m).equals(matches[0]);
        }, passErr, done);
    });

    it("should return two items when maxLength == 2 but tolerance is .1", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                maxResults: 2,
                tolerance: .1,
            })
        )().subscribe(m => {
            expect(m instanceof Multiple).to.be.true;
            expect((m as Multiple).results.length).to.eql(2);
            expect((m as Multiple).results[0]).equals(spreaded[0]);
            expect((m as Multiple).results[1]).equals(spreaded[1]);
        }, passErr, done);
    });

    it("should return all items when tolerance is 1", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                tolerance: 1,
            })
        )().subscribe(m => {
            expect(m instanceof Multiple).to.be.true;
            expect((m as Multiple).results.length).to.eql(4);
            expect((m as Multiple).results).deep.equals(spreaded);
        }, passErr, done);
    });
});

describe("best", () => {
    it("should return the top 1 item", done => {
        best(
            () => matches[0],
            () => new Multiple(spreadme),
            () => matches[1],
        )()
        .subscribe(m => {
            expect(m instanceof Multiple).to.be.false;
            expect(m).equals(matches[0]);
        }, passErr, done);
    })
});
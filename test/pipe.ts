import { describe, expect, passErr, throwErr } from './common';
import { pipe, run, Value, tap, Action, alwaysEmit, transformResult } from '../src/prague';

describe("pipe", () => {

    it('should not emit first transform returns undefined', done => {
        pipe(
            () => undefined,
        )().subscribe(throwErr, passErr, done)
    });

    it('should not emit and not call second transform when first transform returns undefined', done => {
        pipe(
            () => undefined,
            throwErr,
        )().subscribe(throwErr, passErr, done)
    });

    it('should not emit when second transform returns undefined', done => {
        pipe(
            () => "hi",
            () => undefined,
        )().subscribe(throwErr, passErr, done)
    });

    it('should pass through argument to first transform', done => {
        alwaysEmit(
            pipe(
                (a: string) => a,
            )
        )("hi").subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        alwaysEmit(
            pipe(
                (a: string, b: number) => a.repeat(b),
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        alwaysEmit(
            pipe(
                (a: string, b: number) => a.repeat(b),
                a => a,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });
});

describe("tap", () => {
    it("should get the result of the previous function, and pass through to following function", done => {
        let handled = "no";
        alwaysEmit(
            pipe(
                (a: string, b: number) => a.repeat(b),
                tap(a => {
                    handled = a.value;
                }),
                a => a,
            )  
        )("hi", 2).subscribe(m => {
            expect(handled).to.equal("hihi");
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).to.equal("hihi");
        }, passErr, done);
    });
});

describe("transformResult", () => {
    it("should pass through results of other than the stated class", done => {
        const v = new Value("hi");
        alwaysEmit(
            pipe(
                () => v,
                transformResult(Action, throwErr),
            )
        )().subscribe(m => {
            expect(m).equals(v);
        }, passErr, done);
    });

    it("should transform results of the stated class", done => {
        const v = new Value("hi");
        const v2 = new Value("bye");
        alwaysEmit(
            pipe(
                () => v,
                transformResult(Value, () => v2),
            )
        )().subscribe(m => {
            expect(m).equals(v2);
        }, passErr, done);
    });
});

describe("run", () => {
    it("should ignore non-action result", done => {
        alwaysEmit(
            pipe(
                (a: string, b: number) => a.repeat(b),
                run,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).to.equal("hihi");
        }, passErr, done);
    });

    it("should run action of Action", done => {
        let handled = "no";

        alwaysEmit(
            pipe(
                (a: string) => () => {
                    handled = a;
                },
                run,
            )
        )("hi").subscribe(m => {
            expect(handled).equals("hi");
            expect(m).instanceOf(Action);
        }, passErr, done);
    });
});
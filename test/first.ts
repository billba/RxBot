import { describe, expect, passErr, throwErr } from './common';
import { first, Match, emitNoResult, NoResult } from '../src/prague';

describe("first", () => {
    it("should not emit on no transforms", done => {
        first(
        )().subscribe(throwErr, passErr, done)
    });

    it("should not emit on undefined", done => {
        first(
            () => undefined
        )().subscribe(throwErr, passErr, done)
    });

    it("returns result of first transform when Match", done => {
        emitNoResult(
            first(
                () => "hi"
            )
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done)
    });

    it("returns result of second transform when first is undefined", done => {
        emitNoResult(
            first(
                () => undefined,
                () => "hi",
            )
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done)
    });

    it("ignores second transform when first is Match", done => {
        emitNoResult(
            first(
                () => "hi",
                throwErr,
            )
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done)
    });

    it("passes through arguments to all functions", done => {
        emitNoResult(
            first(
                (a: string, b: number) => undefined,
                (a, b) => a.repeat(b),
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done)
    });
});

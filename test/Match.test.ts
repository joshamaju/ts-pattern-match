import { describe, it, expect } from "vitest";
import * as Either from "fp-ts/Either";
import * as Option from "fp-ts/Option";
import { pipe } from "fp-ts/function";

import * as M from "../src/Match.js";
import * as Predicate from "../src/Predicate.js";

describe("Match", () => {
  it("TypeMatcher.pipe() method", () => {
    const match = M.type<string | number>().pipe(
      M.when(M.number, (n) => `number: ${n}`),
      M.when(M.string, (s) => `string: ${s}`),
      M.exhaustive,
    );

    expect(match(123)).toStrictEqual("number: 123");
    expect(match("hello")).toStrictEqual("string: hello");
  });

  it("ValueMatcher.pipe() method", () => {
    const input: string | number = 123;
    const match = M.value(input).pipe(
      M.when(M.number, (n) => `number: ${n}`),
      M.when(M.string, (s) => `string: ${s}`),
      M.exhaustive,
    );

    expect(match).toStrictEqual("number: 123");
  });

  it("exhaustive", () => {
    const match = pipe(
      M.type<{ a: number } | { b: number }>(),
      M.when({ a: M.number }, (_) => _.a),
      M.when({ b: M.number }, (_) => _.b),
      M.exhaustive,
    );

    expect(match({ a: 0 })).toStrictEqual(0);
    expect(match({ b: 1 })).toStrictEqual(1);
  });

  it("exhaustive-literal", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.when({ _tag: "A" }, (_) => Either.right(_.a)),
      M.when({ _tag: "B" }, (_) => Either.right(_.b)),
      M.exhaustive,
    );

    expect(match({ _tag: "A", a: 0 })).toMatchObject({
      _tag: "Right",
      right: 0,
    });
    expect(match({ _tag: "B", b: 1 })).toMatchObject({
      _tag: "Right",
      right: 1,
    });
  });

  it("schema exhaustive-literal", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number | string } | { _tag: "B"; b: number }>(),
      M.when({ _tag: M.is("A", "B"), a: M.number }, (_) => {
        return Either.right(_._tag);
      }),
      M.when({ _tag: M.string, a: M.string }, (_) => {
        return Either.right(_._tag);
      }),
      M.when({ b: M.number }, (_) => Either.left(_._tag)),
      M.orElse((_) => {
        throw "absurd";
      }),
    );

    expect(match({ _tag: "A", a: 0 })).toMatchObject({
      _tag: "Right",
      right: "A",
    });
    expect(match({ _tag: "A", a: "hi" })).toMatchObject({
      _tag: "Right",
      right: "A",
    });
    expect(match({ _tag: "B", b: 1 })).toMatchObject({
      _tag: "Left",
      left: "B",
    });
  });

  it("exhaustive literal with not", () => {
    const match = pipe(
      M.type<number>(),
      M.when(1, (_) => true),
      M.not(1, (_) => false),
      M.exhaustive,
    );

    expect(match(1)).toBeTruthy();
    expect(match(2)).toBeFalsy();
  });

  it("inline", () => {
    const result = pipe(
      M.value(Either.right(0)),
      M.tag("Right", (_) => _.right),
      M.tag("Left", (_) => _.left),
      M.exhaustive,
    );

    expect(result).toStrictEqual(0);
  });

  it("piped", () => {
    const result = pipe(
      Either.right(0),
      M.value,
      M.when({ _tag: "Right" }, (_) => _.right),
      M.option,
    );

    expect(result).toMatchObject({ _tag: "Some", value: 0 });
  });

  it("tuples", () => {
    const match = pipe(
      M.type<[string, string]>(),
      M.when(["yeah"], (_) => {
        return true;
      }),
      M.option,
    );

    expect(match({ length: 2 } as any)).toMatchObject({ _tag: "None" });
    expect(match(["a", "b"])).toMatchObject({ _tag: "None" });
    expect(match(["yeah", "a"])).toMatchObject({ _tag: "Some", value: true });
  });

  it("literals", () => {
    const match = pipe(
      M.type<string>(),
      M.when("yeah", (_) => _ === "yeah"),
      M.orElse(() => "nah"),
    );

    expect(match("yeah")).toStrictEqual(true);
    expect(match("a")).toStrictEqual("nah");
  });

  it("piped", () => {
    const result = pipe(
      Either.right(0),
      M.value,
      M.when({ _tag: "Right" }, (_) => _.right),
      M.option,
    );

    expect(result).toMatchObject({ _tag: "Some", value: 0 });
  });

  it("not schema", () => {
    const match = pipe(
      M.type<string | number>(),
      M.not(M.number, (_) => "a"),
      M.when(M.number, (_) => "b"),
      M.exhaustive,
    );

    expect(match("hi")).toStrictEqual("a");
    expect(match(123)).toStrictEqual("b");
  });

  it("not literal", () => {
    const match = pipe(
      M.type<string | number>(),
      M.not("hi", (_) => {
        return "a";
      }),
      M.orElse((_) => "b"),
    );

    expect(match("hello")).toStrictEqual("a");
    expect(match("hi")).toStrictEqual("b");
  });

  it("literals", () => {
    const match = pipe(
      M.type<string>(),
      M.when("yeah", (_) => {
        return _ === "yeah";
      }),
      M.orElse(() => "nah"),
    );

    expect(match("yeah")).toStrictEqual(true);
    expect(match("a")).toStrictEqual("nah");
  });

  it("literals duplicate", () => {
    const result = pipe(
      M.value("yeah" as string),
      M.when("yeah", (_) => _ === "yeah"),
      M.when("yeah", (_) => "dupe"),
      M.orElse((_) => "nah"),
    );

    expect(result).toStrictEqual(true);
  });

  it("discriminator", () => {
    const match = pipe(
      M.type<{ type: "A" } | { type: "B" }>(),
      M.discriminator("type")("A", (_) => _.type),
      M.discriminator("type")("B", (_) => _.type),
      M.exhaustive,
    );

    expect(match({ type: "B" })).toStrictEqual("B");
  });

  it("discriminator with nullables", () => {
    const match = M.type<{ _tag: "A" } | undefined>().pipe(
      M.tags({ A: (x) => x._tag }),
      M.orElse(() => null),
    );

    expect(() => match(undefined)).not.throw();
  });

  it("discriminator multiple", () => {
    const result = pipe(
      M.value(Either.right(0)),
      M.discriminator("_tag")("Right", "Left", (_) => "match"),
      M.exhaustive,
    );

    expect(result).toStrictEqual("match");
  });

  it("nested", () => {
    const match = pipe(
      M.type<
        | { foo: { bar: { baz: { qux: string } } } }
        | { foo: { bar: { baz: { qux: number } } } }
        | { foo: { bar: null } }
      >(),
      M.when({ foo: { bar: { baz: { qux: 2 } } } }, (_) => {
        return `literal ${_.foo.bar.baz.qux}`;
      }),
      M.when({ foo: { bar: { baz: { qux: "b" } } } }, (_) => {
        return `literal ${_.foo.bar.baz.qux}`;
      }),
      M.when(
        { foo: { bar: { baz: { qux: M.number } } } },
        (_) => _.foo.bar.baz.qux,
      ),
      M.when(
        { foo: { bar: { baz: { qux: M.string } } } },
        (_) => _.foo.bar.baz.qux,
      ),
      M.when({ foo: { bar: null } }, (_) => _.foo.bar),
      M.exhaustive,
    );

    expect(match({ foo: { bar: { baz: { qux: 1 } } } })).toStrictEqual(1);
    expect(match({ foo: { bar: { baz: { qux: 2 } } } })).toStrictEqual(
      "literal 2",
    );
    expect(match({ foo: { bar: { baz: { qux: "a" } } } })).toStrictEqual("a");
    expect(match({ foo: { bar: { baz: { qux: "b" } } } })).toStrictEqual(
      "literal b",
    );
    expect(match({ foo: { bar: null } })).toStrictEqual(null);
  });

  it("nested Option", () => {
    const match = pipe(
      M.type<{ user: Option.Option<{ readonly name: string }> }>(),
      M.when({ user: { _tag: "Some" } }, (_) => _.user.value.name),
      M.orElse((_) => "fail"),
    );

    expect(match({ user: Option.some({ name: "a" }) })).toStrictEqual("a");
    expect(match({ user: Option.none })).toStrictEqual("fail");
  });

  it("predicate", () => {
    const match = pipe(
      M.type<{ age: number }>(),
      M.when({ age: (a) => a >= 5 }, (_) => `Age: ${_.age}`),
      M.orElse((_) => `${_.age} is too young`),
    );

    expect(match({ age: 5 })).toStrictEqual("Age: 5");
    expect(match({ age: 4 })).toStrictEqual("4 is too young");
  });

  it("predicate not", () => {
    const match = pipe(
      M.type<{ age: number }>(),
      M.not({ age: (a) => a >= 5 }, (_) => `Age: ${_.age}`),
      M.orElse((_) => `${_.age} is too old`),
    );

    expect(match({ age: 4 })).toStrictEqual("Age: 4");
    expect(match({ age: 5 })).toStrictEqual("5 is too old");

    const result = pipe(
      M.value({ age: 4 }),
      M.not({ age: (a) => a >= 5 }, (_) => `Age: ${_.age}`),
      M.orElse((_) => `${_.age} is too old`),
    );

    expect(result).toStrictEqual("Age: 4");
  });

  it("predicate with functions", () => {
    const match = pipe(
      M.type<{
        a: number;
        b: {
          c: string;
          f?: (status: number) => Promise<string>;
        };
      }>(),
      M.when({ a: 400 }, (_) => "400"),
      M.when({ b: (b) => b.c === "nested" }, (_) => _.b.c),
      M.orElse(() => "fail"),
    );

    expect(match({ b: { c: "nested" }, a: 200 })).toStrictEqual("nested");
    expect(match({ b: { c: "nested" }, a: 400 })).toStrictEqual("400");
  });

  it("predicate at root level", () => {
    const match = pipe(
      M.type<{
        a: number;
        b: {
          c: string;
          f?: (status: number) => Promise<string>;
        };
      }>(),
      M.when(
        (_) => _.a === 400,
        (_) => "400",
      ),
      M.when({ b: (b) => b.c === "nested" }, (_) => _.b.c),
      M.orElse(() => "fail"),
    );

    expect(match({ b: { c: "nested" }, a: 200 })).toStrictEqual("nested");
    expect(match({ b: { c: "nested" }, a: 400 })).toStrictEqual("400");
  });

  it("symbols", () => {
    const thing = {
      symbol: Symbol(),
      name: "thing",
    } as const;

    const match = pipe(
      M.value(thing),
      M.when({ name: "thing" }, (_) => _.name),
      M.exhaustive,
    );

    expect(match).toStrictEqual("thing");
  });

  it("unify", () => {
    const match = pipe(
      M.type<{ readonly _tag: "A" } | { readonly _tag: "B" }>(),
      M.tag("A", () => Either.right("a") as Either.Either<string, number>),
      M.tag("B", () => Either.right(123) as Either.Either<number, string>),
      M.exhaustive,
    );

    expect(match({ _tag: "B" })).toEqual({ _tag: "Right", right: 123 });
  });

  it("optional props", () => {
    const match = pipe(
      M.type<{ readonly user?: { readonly name: string } | undefined }>(),
      M.when({ user: M.any }, (_) => _.user?.name),
      M.orElse(() => "no user"),
    );

    expect(match({})).toStrictEqual("no user");
    expect(match({ user: undefined })).toStrictEqual(undefined);
    expect(match({ user: { name: "Tim" } })).toStrictEqual("Tim");
  });

  it("optional props defined", () => {
    const match = pipe(
      M.type<{
        readonly user?: { readonly name: string } | null | undefined;
      }>(),
      M.when({ user: M.defined }, (_) => _.user.name),
      M.orElse(() => "no user"),
    );

    expect(match({})).toStrictEqual("no user");
    expect(match({ user: undefined })).toStrictEqual("no user");
    expect(match({ user: null })).toStrictEqual("no user");
    expect(match({ user: { name: "Tim" } })).toStrictEqual("Tim");
  });

  it("deep recursive", () => {
    type A = null | string | number | { [K in string]: A };

    const match = pipe(
      M.type<A>(),
      M.when(Predicate.isNull, (_) => {
        return "null";
      }),
      M.when(Predicate.isBoolean, (_) => {
        return "boolean";
      }),
      M.when(Predicate.isNumber, (_) => {
        return "number";
      }),
      M.when(Predicate.isString, (_) => {
        return "string";
      }),
      M.when(M.record, (_) => {
        return "record";
      }),
      M.when(Predicate.isSymbol, (_) => {
        return "symbol";
      }),
      M.when(Predicate.isReadonlyRecord, (_) => {
        return "readonlyrecord";
      }),
      M.exhaustive,
    );

    expect(match(null)).toStrictEqual("null");
    expect(match(123)).toStrictEqual("number");
    expect(match("hi")).toStrictEqual("string");
    expect(match({})).toStrictEqual("record");
  });

  it("nested option", () => {
    type ABC =
      | { readonly _tag: "A" }
      | { readonly _tag: "B" }
      | { readonly _tag: "C" };

    const match = pipe(
      M.type<{ readonly abc: Option.Option<ABC> }>(),
      M.when({ abc: { value: { _tag: "A" } } }, (_) => _.abc.value._tag),
      M.orElse((_) => "no match"),
    );

    expect(match({ abc: Option.some({ _tag: "A" }) })).toStrictEqual("A");
    expect(match({ abc: Option.some({ _tag: "B" }) })).toStrictEqual(
      "no match",
    );
    expect(match({ abc: Option.none })).toStrictEqual("no match");
  });

  it("getters", () => {
    class Thing {
      get name() {
        return "thing";
      }
    }

    const match = pipe(
      M.value(new Thing()),
      M.when({ name: "thing" }, (_) => _.name),
      M.orElse(() => "fail"),
    );

    expect(match).toStrictEqual("thing");
  });

  it("whenOr", () => {
    const match = pipe(
      M.type<
        { _tag: "A"; a: number } | { _tag: "B"; b: number } | { _tag: "C" }
      >(),
      M.whenOr({ _tag: "A" }, { _tag: "B" }, (_) => "A or B"),
      M.when({ _tag: "C" }, (_) => "C"),
      M.exhaustive,
    );

    expect(match({ _tag: "A", a: 0 })).toStrictEqual("A or B");
    expect(match({ _tag: "B", b: 1 })).toStrictEqual("A or B");
    expect(match({ _tag: "C" })).toStrictEqual("C");
  });

  it("optional array", () => {
    const match = pipe(
      M.type<{ a?: ReadonlyArray<{ name: string }> }>(),
      M.when({ a: (_) => _.length > 0 }, (_) => `match ${_.a.length}`),
      M.orElse(() => "no match"),
    );

    expect(match({ a: [{ name: "Tim" }] })).toStrictEqual("match 1");
    expect(match({ a: [] })).toStrictEqual("no match");
    expect(match({})).toStrictEqual("no match");
  });

  it("whenAnd", () => {
    const match = pipe(
      M.type<
        { _tag: "A"; a: number } | { _tag: "B"; b: number } | { _tag: "C" }
      >(),
      M.whenAnd({ _tag: "A" }, { a: M.number }, (_) => "A"),
      M.whenAnd({ _tag: "B" }, { b: M.number }, (_) => "B"),
      M.when({ _tag: "C" }, (_) => "C"),
      M.exhaustive,
    );

    expect(match({ _tag: "A", a: 0 })).toStrictEqual("A");
    expect(match({ _tag: "B", b: 1 })).toStrictEqual("B");
    expect(match({ _tag: "C" })).toStrictEqual("C");
  });

  it("whenAnd nested", () => {
    const match = pipe(
      M.type<{
        status: number;
        user?: {
          name: string;
          manager?: {
            name: string;
          };
        };
        company?: {
          name: string;
        };
      }>(),
      M.whenAnd(
        { status: 200 },
        { user: { name: M.string } },
        { user: { manager: { name: M.string } } },
        { company: { name: M.string } },
        (_) =>
          [_.status, _.user.name, _.user.manager.name, _.company.name].join(
            ", ",
          ),
      ),
      M.whenAnd(
        { status: 200 },
        { user: { name: M.string } },
        { company: { name: M.string } },
        (_) => [_.status, _.user.name, _.company.name].join(", "),
      ),
      M.whenAnd({ status: 200 }, { user: { name: M.string } }, (_) =>
        [_.status, _.user.name].join(", "),
      ),
      M.whenAnd({ status: M.number }, { user: { name: M.string } }, (_) =>
        ["number", _.user.name].join(", "),
      ),
      M.when({ status: M.number }, (_) => "number"),
      M.exhaustive,
    );

    expect(
      match({
        status: 200,
        user: { name: "Tim", manager: { name: "Joe" } },
        company: { name: "Apple" },
      }),
    ).toStrictEqual("200, Tim, Joe, Apple");

    expect(
      match({
        status: 200,
        user: { name: "Tim" },
        company: { name: "Apple" },
      }),
    ).toStrictEqual("200, Tim, Apple");

    expect(
      match({
        status: 200,
        user: { name: "Tim" },
        company: { name: "Apple" },
      }),
    ).toStrictEqual("200, Tim, Apple");

    expect(
      match({
        status: 200,
        user: { name: "Tim" },
      }),
    ).toStrictEqual("200, Tim");

    expect(match({ status: 100, user: { name: "Tim" } })).toStrictEqual(
      "number, Tim",
    );

    expect(match({ status: 100 })).toStrictEqual("number");
  });

  it("instanceOf", () => {
    const match = pipe(
      M.type<Uint8Array | Uint16Array>(),
      M.when(M.instanceOf(Uint8Array), (_) => {
        return "uint8";
      }),
      M.when(M.instanceOf(Uint16Array), (_) => {
        return "uint16";
      }),
      M.orElse((_) => {
        throw "absurd";
      }),
    );

    expect(match(new Uint8Array([1, 2, 3]))).toStrictEqual("uint8");
    expect(match(new Uint16Array([1, 2, 3]))).toStrictEqual("uint16");
  });

  it("tags", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.tags({
        A: (_) => _.a,
        B: (_) => "B",
      }),
      M.exhaustive,
    );

    expect(match({ _tag: "A", a: 1 })).toStrictEqual(1);
    expect(match({ _tag: "B", b: 1 })).toStrictEqual("B");
  });

  it("tagsExhaustive", () => {
    const match = pipe(
      M.type<{ _tag: "A"; a: number } | { _tag: "B"; b: number }>(),
      M.tagsExhaustive({
        A: (_) => _.a,
        B: (_) => "B",
      }),
    );

    expect(match({ _tag: "A", a: 1 })).toStrictEqual(1);
    expect(match({ _tag: "B", b: 1 })).toStrictEqual("B");
  });

  it("valueTags", () => {
    type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number };
    const match = pipe(
      { _tag: "A", a: 123 } as Value,
      M.valueTags({
        A: (_) => _.a,
        B: (_) => "B",
      }),
    );

    expect(match).toStrictEqual(123);
  });

  it("typeTags", () => {
    type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number };
    const matcher = M.typeTags<Value>();

    expect(
      matcher({
        A: (_) => _.a,
        B: (_) => "fail",
      })({ _tag: "A", a: 123 }),
    ).toStrictEqual(123);

    expect(
      matcher({
        A: (_) => _.a,
        B: (_) => "B",
      })({ _tag: "B", b: 123 }),
    ).toStrictEqual("B");
  });

  it("refinement - with unknown", () => {
    const isArray = (_: unknown): _ is ReadonlyArray<unknown> =>
      Array.isArray(_);

    const match = pipe(
      M.type<string | Array<number>>(),
      M.when(isArray, (_) => {
        return "array";
      }),
      M.when(Predicate.isString, () => "string"),
      M.exhaustive,
    );

    expect(match([])).toStrictEqual("array");
    expect(match("fail")).toStrictEqual("string");
  });

  it("refinement nested - with unknown", () => {
    const isArray = (_: unknown): _ is ReadonlyArray<unknown> =>
      Array.isArray(_);

    const match = pipe(
      M.type<{ readonly a: string | Array<number> }>(),
      M.when({ a: isArray }, (_) => "array"),
      M.orElse(() => "fail"),
    );

    expect(match({ a: [123] })).toStrictEqual("array");
    expect(match({ a: "fail" })).toStrictEqual("fail");
  });

  it("unknown - refinement", () => {
    const match = pipe(
      M.type<unknown>(),
      M.when(Predicate.isReadonlyRecord, (_) => "record"),
      M.orElse(() => "unknown"),
    );

    expect(match({})).toStrictEqual("record");
    expect(match([])).toStrictEqual("unknown");
  });

  it("any - refinement", () => {
    const match = pipe(
      M.type<any>(),
      M.when(Predicate.isReadonlyRecord, (_) => "record"),
      M.orElse(() => "unknown"),
    );

    expect(match({})).toStrictEqual("record");
    expect(match([])).toStrictEqual("unknown");
  });

  it("discriminatorStartsWith", () => {
    const match = pipe(
      M.type<{ type: "A" } | { type: "B" } | { type: "A.A" } | {}>(),
      M.discriminatorStartsWith("type")("A", (_) => 1 as const),
      M.discriminatorStartsWith("type")("B", (_) => 2 as const),
      M.orElse((_) => 3 as const),
    );

    expect(match({ type: "A" })).toStrictEqual(1);
    expect(match({ type: "A.A" })).toStrictEqual(1);
    expect(match({ type: "B" })).toStrictEqual(2);
    expect(match({})).toStrictEqual(3);
  });

  it("symbol", () => {
    const match = pipe(
      M.type<unknown>(),
      M.when(M.symbol, (_) => "symbol"),
      M.orElse(() => "else"),
    );

    expect(match(Symbol.for("a"))).toStrictEqual("symbol");
    expect(match(123)).toStrictEqual("else");
  });

  it("withReturnType", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<string>(),
      M.when("A", (_) => "A"),
      M.orElse(() => "else"),
    );

    expect(match("A")).toStrictEqual("A");
    expect(match("a")).toStrictEqual("else");
  });

  it("withReturnType after predicate", () => {
    const match = pipe(
      M.type<string>(),
      M.when("A", (_) => "A"),
      M.withReturnType<string>(),
      M.orElse(() => "else"),
    );

    expect(match("A")).toStrictEqual("A");
    expect(match("a")).toStrictEqual("else");
  });

  it("withReturnType mismatch", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<string>(),
      // @ts-expect-error
      M.when("A", (_) => 123),
      M.orElse(() => "else"),
    );

    expect(match("A")).toStrictEqual(123);
    expect(match("a")).toStrictEqual("else");
  });

  it("withReturnType constraint mismatch", () => {
    pipe(
      M.type<string>(),
      M.when("A", (_) => 123),
      M.withReturnType<string>(),
      // @ts-expect-error
      M.orElse(() => "else"),
    );
  });

  it("withReturnType union", () => {
    const match = pipe(
      M.type<string>(),
      M.withReturnType<"a" | "b">(),
      M.when("A", (_) => "a"),
      M.orElse((_) => "b"),
    );

    expect(match("A")).toStrictEqual("a");
    expect(match("a")).toStrictEqual("b");
  });

  it("withReturnType union mismatch", () => {
    pipe(
      M.type<string>(),
      M.withReturnType<"a" | "b">(),
      M.when("A", (_) => "a"),
      // @ts-expect-error
      M.orElse((_) => "c"),
    );
  });

  it("nonEmptyString", () => {
    const match = M.type<string | number>().pipe(
      M.when(M.nonEmptyString, () => "ok"),
      M.orElse(() => "empty"),
    );

    expect(match("hello")).toStrictEqual("ok");
    expect(match("")).toStrictEqual("empty");
  });

  it("is", () => {
    const match = M.type<string>().pipe(
      M.when(M.is("A"), () => "ok"),
      M.orElse(() => "ko"),
    );

    expect(match("A")).toStrictEqual("ok");
    expect(match("C")).toStrictEqual("ko");
  });

  it("orElseAbsurd should throw if a match is not found", () => {
    const match = M.type<string>().pipe(
      M.when(M.is("A", "B"), () => "ok"),
      M.orElseAbsurd,
    );

    expect(match("A")).toStrictEqual("ok");
    expect(match("B")).toStrictEqual("ok");
    expect(() => match("C")).toThrowError(
      new Error("effect/Match/orElseAbsurd: absurd"),
    );
  });

  it("option (with M.value) should return None if a match is not found", () => {
    const result = M.value("C").pipe(
      M.when(M.is("A", "B"), () => "ok"),
      M.option,
    );

    expect(result).toEqual({ _tag: "None" });
  });

  it("exhaustive should throw on invalid inputs", () => {
    const match = M.type<"A">().pipe(
      M.when(M.is("A"), () => "ok"),
      M.exhaustive,
    );

    expect(() => match("C" as "A")).toThrow();

    expect(() =>
      M.value("C" as "A").pipe(
        M.when(M.is("A"), () => "ok"),
        M.exhaustive,
      ),
    ).toThrow();
  });

  it("orElse (with M.value) should return the default if a match is not found", () => {
    const result = M.value("C").pipe(
      M.when(M.is("A", "B"), () => "ok"),
      M.orElse(() => "default"),
    );

    expect(result).toStrictEqual("default");
  });

  it("tag + withReturnType doesn't need as const for string literals", () => {
    type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number };
    const result = M.value<Value>({ _tag: "A", a: 1 }).pipe(
      M.withReturnType<"a" | "b">(),
      M.tag("A", () => "a"),
      M.tag("B", () => "b"),
      M.exhaustive,
    );

    expect(result).toStrictEqual("a");
  });
});

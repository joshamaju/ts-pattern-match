import { pipe } from "fp-ts/function";
import * as Fun from "fp-ts/function";
import { describe, it, expect } from "vitest";

import * as Predicate from "../src/Predicate.js";

const isPositive: Predicate.Predicate<number> = (n) => n > 0;
const isNegative: Predicate.Predicate<number> = (n) => n < 0;
const isLessThan2: Predicate.Predicate<number> = (n) => n < 2;
const isString: Predicate.Refinement<unknown, string> = (
  u: unknown,
): u is string => typeof u === "string";

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}

type NonEmptyString = string & NonEmptyStringBrand;

const isNonEmptyString: Predicate.Refinement<string, NonEmptyString> = (
  s,
): s is NonEmptyString => s.length > 0;

describe("Predicate", () => {
  it("compose", () => {
    const refinement = pipe(isString, Predicate.compose(isNonEmptyString));
    expect(refinement("a")).toBeTruthy();
    expect(refinement(null)).toBeFalsy();
    expect(refinement("")).toBeFalsy();
  });

  it("mapInput", () => {
    type A = {
      readonly a: number;
    };
    const predicate = pipe(
      isPositive,
      Predicate.mapInput((a: A) => a.a),
    );
    expect(predicate({ a: -1 })).toBeFalsy();
    expect(predicate({ a: 0 })).toBeFalsy();
    expect(predicate({ a: 1 })).toBeTruthy();
  });

  it("product", () => {
    const product = Predicate.product;
    const p = product(isPositive, isNegative);
    expect(p([1, -1])).toBeTruthy();
    expect(p([1, 1])).toBeFalsy();
    expect(p([-1, -1])).toBeFalsy();
    expect(p([-1, 1])).toBeFalsy();
  });

  it("productMany", () => {
    const productMany = Predicate.productMany;
    const p = productMany(isPositive, [isNegative]);
    expect(p([1, -1])).toBeTruthy();
    expect(p([1, 1])).toBeFalsy();
    expect(p([-1, -1])).toBeFalsy();
    expect(p([-1, 1])).toBeFalsy();
  });

  it("tuple", () => {
    const p = Predicate.tuple(isPositive, isNegative);
    expect(p([1, -1])).toBeTruthy();
    expect(p([1, 1])).toBeFalsy();
    expect(p([-1, -1])).toBeFalsy();
    expect(p([-1, 1])).toBeFalsy();
  });

  it("struct", () => {
    const p = Predicate.struct({ a: isPositive, b: isNegative });
    expect(p({ a: 1, b: -1 })).toBeTruthy();
    expect(p({ a: 1, b: 1 })).toBeFalsy();
    expect(p({ a: -1, b: -1 })).toBeFalsy();
    expect(p({ a: -1, b: 1 })).toBeFalsy();
  });

  it("all", () => {
    const p = Predicate.all([isPositive, isNegative]);
    expect(p([1])).toBeTruthy();
    expect(p([1, -1])).toBeTruthy();
    expect(p([1, 1])).toBeFalsy();
    expect(p([-1, -1])).toBeFalsy();
    expect(p([-1, 1])).toBeFalsy();
  });

  it("not", () => {
    const p = Predicate.not(isPositive);
    expect(p(1)).toBeFalsy();
    expect(p(0)).toBeTruthy();
    expect(p(-1)).toBeTruthy();
  });

  it("or", () => {
    const p = pipe(isPositive, Predicate.or(isNegative));
    expect(p(-1)).toBeTruthy();
    expect(p(1)).toBeTruthy();
    expect(p(0)).toBeFalsy();
  });

  it("and", () => {
    const p = pipe(isPositive, Predicate.and(isLessThan2));
    expect(p(1)).toBeTruthy();
    expect(p(-1)).toBeFalsy();
    expect(p(3)).toBeFalsy();
  });

  it("xor", () => {
    expect(pipe(Fun.constTrue, Predicate.xor(Fun.constTrue))(null)).toBeFalsy(); // true xor true = false
    expect(
      pipe(Fun.constTrue, Predicate.xor(Fun.constFalse))(null),
    ).toBeTruthy(); // true xor false = true
    expect(
      pipe(Fun.constFalse, Predicate.xor(Fun.constTrue))(null),
    ).toBeTruthy(); // false xor true = true
    expect(
      pipe(Fun.constFalse, Predicate.xor(Fun.constFalse))(null),
    ).toBeFalsy(); // false xor false = false
  });

  it("eqv", () => {
    expect(
      pipe(Fun.constTrue, Predicate.eqv(Fun.constTrue))(null),
    ).toBeTruthy(); // true eqv true = true
    expect(
      pipe(Fun.constTrue, Predicate.eqv(Fun.constFalse))(null),
    ).toBeFalsy(); // true eqv false = false
    expect(
      pipe(Fun.constFalse, Predicate.eqv(Fun.constTrue))(null),
    ).toBeFalsy(); // false eqv true = false
    expect(
      pipe(Fun.constFalse, Predicate.eqv(Fun.constFalse))(null),
    ).toBeTruthy(); // false eqv false = true
  });

  it("implies", () => {
    expect(
      pipe(Fun.constTrue, Predicate.implies(Fun.constTrue))(null),
    ).toBeTruthy(); // true implies true = true
    expect(
      pipe(Fun.constTrue, Predicate.implies(Fun.constFalse))(null),
    ).toBeFalsy(); // true implies false = false
    expect(
      pipe(Fun.constFalse, Predicate.implies(Fun.constTrue))(null),
    ).toBeTruthy(); // false implies true = true
    expect(
      pipe(Fun.constFalse, Predicate.implies(Fun.constFalse))(null),
    ).toBeTruthy(); // false implies false = true
  });

  it("nor", () => {
    expect(pipe(Fun.constTrue, Predicate.nor(Fun.constTrue))(null)).toBeFalsy(); // true nor true = false
    expect(
      pipe(Fun.constTrue, Predicate.nor(Fun.constFalse))(null),
    ).toBeFalsy(); // true nor false = false
    expect(
      pipe(Fun.constFalse, Predicate.nor(Fun.constTrue))(null),
    ).toBeFalsy(); // false nor true = false
    expect(
      pipe(Fun.constFalse, Predicate.nor(Fun.constFalse))(null),
    ).toBeTruthy(); // false nor false = true
  });

  it("nand", () => {
    expect(
      pipe(Fun.constTrue, Predicate.nand(Fun.constTrue))(null),
    ).toBeFalsy(); // true nand true = false
    expect(
      pipe(Fun.constTrue, Predicate.nand(Fun.constFalse))(null),
    ).toBeTruthy(); // true nand false = true
    expect(
      pipe(Fun.constFalse, Predicate.nand(Fun.constTrue))(null),
    ).toBeTruthy(); // false nand true = true
    expect(
      pipe(Fun.constFalse, Predicate.nand(Fun.constFalse))(null),
    ).toBeTruthy(); // false nand false = true
  });

  it("some", () => {
    const predicate = Predicate.some([isPositive, isNegative]);
    expect(predicate(0)).toBeFalsy();
    expect(predicate(-1)).toBeTruthy();
    expect(predicate(1)).toBeTruthy();
  });

  it("every", () => {
    const predicate = Predicate.every([isPositive, isLessThan2]);
    expect(predicate(0)).toBeFalsy();
    expect(predicate(-2)).toBeFalsy();
    expect(predicate(1)).toBeTruthy();
  });

  it("isTruthy", () => {
    expect(Predicate.isTruthy(true)).toBeTruthy();
    expect(Predicate.isTruthy(false)).toBeFalsy();
    expect(Predicate.isTruthy("a")).toBeTruthy();
    expect(Predicate.isTruthy("")).toBeFalsy();
    expect(Predicate.isTruthy(1)).toBeTruthy();
    expect(Predicate.isTruthy(0)).toBeFalsy();
    expect(Predicate.isTruthy(1n)).toBeTruthy();
    expect(Predicate.isTruthy(0n)).toBeFalsy();
  });

  it("isFunction", () => {
    expect(Predicate.isFunction(Predicate.isFunction)).toBeTruthy();
    expect(Predicate.isFunction("function")).toBeFalsy();
  });

  it("isUndefined", () => {
    expect(Predicate.isUndefined(undefined)).toBeTruthy();
    expect(Predicate.isUndefined(null)).toBeFalsy();
    expect(Predicate.isUndefined("undefined")).toBeFalsy();
  });

  it("isNotUndefined", () => {
    expect(Predicate.isNotUndefined(undefined)).toBeFalsy();
    expect(Predicate.isNotUndefined(null)).toBeTruthy();
    expect(Predicate.isNotUndefined("undefined")).toBeTruthy();
  });

  it("isNull", () => {
    expect(Predicate.isNull(null)).toBeTruthy();
    expect(Predicate.isNull(undefined)).toBeFalsy();
    expect(Predicate.isNull("null")).toBeFalsy();
  });

  it("isNotNull", () => {
    expect(Predicate.isNotNull(null)).toBeFalsy();
    expect(Predicate.isNotNull(undefined)).toBeTruthy();
    expect(Predicate.isNotNull("null")).toBeTruthy();
  });

  it("isNever", () => {
    expect(Predicate.isNever(null)).toBeFalsy();
    expect(Predicate.isNever(undefined)).toBeFalsy();
    expect(Predicate.isNever({})).toBeFalsy();
    expect(Predicate.isNever([])).toBeFalsy();
  });

  it("isUnknown", () => {
    expect(Predicate.isUnknown(null)).toBeTruthy();
    expect(Predicate.isUnknown(undefined)).toBeTruthy();
    expect(Predicate.isUnknown({})).toBeTruthy();
    expect(Predicate.isUnknown([])).toBeTruthy();
  });

  it("isObject", () => {
    expect(Predicate.isObject({})).toBeTruthy();
    expect(Predicate.isObject([])).toBeTruthy();
    expect(Predicate.isObject(() => 1)).toBeTruthy();
    expect(Predicate.isObject(null)).toBeFalsy();
    expect(Predicate.isObject(undefined)).toBeFalsy();
    expect(Predicate.isObject("a")).toBeFalsy();
    expect(Predicate.isObject(1)).toBeFalsy();
    expect(Predicate.isObject(true)).toBeFalsy();
    expect(Predicate.isObject(1n)).toBeFalsy();
    expect(Predicate.isObject(Symbol.for("a"))).toBeFalsy();
  });

  it("isSet", () => {
    expect(Predicate.isSet(new Set([1, 2]))).toBeTruthy();
    expect(Predicate.isSet(new Set())).toBeTruthy();
    expect(Predicate.isSet({})).toBeFalsy();
    expect(Predicate.isSet(null)).toBeFalsy();
    expect(Predicate.isSet(undefined)).toBeFalsy();
  });

  it("isMap", () => {
    expect(Predicate.isMap(new Map())).toBeTruthy();
    expect(Predicate.isMap({})).toBeFalsy();
    expect(Predicate.isMap(null)).toBeFalsy();
    expect(Predicate.isMap(undefined)).toBeFalsy();
  });

  it("hasProperty", () => {
    const a = Symbol.for("effect/test/a");

    expect(Predicate.hasProperty({ a: 1 }, "a")).toBeTruthy();
    expect(Predicate.hasProperty("a")({ a: 1 })).toBeTruthy();
    expect(Predicate.hasProperty({ [a]: 1 }, a)).toBeTruthy();
    expect(Predicate.hasProperty(a)({ [a]: 1 })).toBeTruthy();

    expect(Predicate.hasProperty({}, "a")).toBeFalsy();
    expect(Predicate.hasProperty(null, "a")).toBeFalsy();
    expect(Predicate.hasProperty(undefined, "a")).toBeFalsy();
    expect(Predicate.hasProperty({}, "a")).toBeFalsy();
    expect(Predicate.hasProperty(() => {}, "a")).toBeFalsy();

    expect(Predicate.hasProperty({}, a)).toBeFalsy();
    expect(Predicate.hasProperty(null, a)).toBeFalsy();
    expect(Predicate.hasProperty(undefined, a)).toBeFalsy();
    expect(Predicate.hasProperty({}, a)).toBeFalsy();
    expect(Predicate.hasProperty(() => {}, a)).toBeFalsy();
  });

  it("isTagged", () => {
    expect(Predicate.isTagged(1, "a")).toBeFalsy();
    expect(Predicate.isTagged("", "a")).toBeFalsy();
    expect(Predicate.isTagged({}, "a")).toBeFalsy();
    expect(Predicate.isTagged("a")({})).toBeFalsy();
    expect(Predicate.isTagged({ a: "a" }, "a")).toBeFalsy();
    expect(Predicate.isTagged({ _tag: "a" }, "a")).toBeTruthy();
    expect(Predicate.isTagged("a")({ _tag: "a" })).toBeTruthy();
  });

  it("isNullable", () => {
    expect(Predicate.isNullable(null)).toBeTruthy();
    expect(Predicate.isNullable(undefined)).toBeTruthy();
    expect(Predicate.isNullable({})).toBeFalsy();
    expect(Predicate.isNullable([])).toBeFalsy();
  });

  it("isNotNullable", () => {
    expect(Predicate.isNotNullable({})).toBeTruthy();
    expect(Predicate.isNotNullable([])).toBeTruthy();
    expect(Predicate.isNotNullable(null)).toBeFalsy();
    expect(Predicate.isNotNullable(undefined)).toBeFalsy();
  });

  it("isError", () => {
    expect(Predicate.isError(new Error())).toBeTruthy();
    expect(Predicate.isError(null)).toBeFalsy();
    expect(Predicate.isError({})).toBeFalsy();
  });

  it("isUint8Array", () => {
    expect(Predicate.isUint8Array(new Uint8Array())).toBeTruthy();
    expect(Predicate.isUint8Array(null)).toBeFalsy();
    expect(Predicate.isUint8Array({})).toBeFalsy();
  });

  it("isDate", () => {
    expect(Predicate.isDate(new Date())).toBeTruthy();
    expect(Predicate.isDate(null)).toBeFalsy();
    expect(Predicate.isDate({})).toBeFalsy();
  });

  it("isIterable", () => {
    expect(Predicate.isIterable([])).toBeTruthy();
    expect(Predicate.isIterable(new Set())).toBeTruthy();
    expect(Predicate.isIterable(null)).toBeFalsy();
    expect(Predicate.isIterable({})).toBeFalsy();
  });

  it("isRecord", () => {
    expect(Predicate.isRecord({})).toBeTruthy();
    expect(Predicate.isRecord({ a: 1 })).toBeTruthy();

    expect(Predicate.isRecord([])).toBeFalsy();
    expect(Predicate.isRecord([1, 2, 3])).toBeFalsy();
    expect(Predicate.isRecord(null)).toBeFalsy();
    expect(Predicate.isRecord(undefined)).toBeFalsy();
    expect(Predicate.isRecord(() => null)).toBeFalsy();
  });

  it("isReadonlyRecord", () => {
    expect(Predicate.isReadonlyRecord({})).toBeTruthy();
    expect(Predicate.isReadonlyRecord({ a: 1 })).toBeTruthy();

    expect(Predicate.isReadonlyRecord([])).toBeFalsy();
    expect(Predicate.isReadonlyRecord([1, 2, 3])).toBeFalsy();
    expect(Predicate.isReadonlyRecord(null)).toBeFalsy();
    expect(Predicate.isReadonlyRecord(undefined)).toBeFalsy();
  });

  it("isTupleOf", () => {
    expect(Predicate.isTupleOf([1, 2, 3], 3)).toBeTruthy();
    expect(Predicate.isTupleOf([1, 2, 3], 4)).toBeFalsy();
    expect(Predicate.isTupleOf([1, 2, 3], 2)).toBeFalsy();
  });

  it("isTupleOfAtLeast", () => {
    expect(Predicate.isTupleOfAtLeast([1, 2, 3], 3)).toBeTruthy();
    expect(Predicate.isTupleOfAtLeast([1, 2, 3], 2)).toBeTruthy();
    expect(Predicate.isTupleOfAtLeast([1, 2, 3], 4)).toBeFalsy();
  });

  it("isRegExp", () => {
    expect(Predicate.isRegExp(/a/)).toBeTruthy();
    expect(Predicate.isRegExp(null)).toBeFalsy();
    expect(Predicate.isRegExp("a")).toBeFalsy();
  });
});

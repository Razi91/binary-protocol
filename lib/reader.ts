import _ from "lodash";
import { ReaderFunction } from "./index";

type BufferType = Buffer;


export default class Reader {
  buffer: BufferType;
  offset: number;
  result: any;
  path: Array<string | number>;
  __methods: any;

  constructor(buffer: BufferType) {
    this.buffer = buffer;
    this.offset = 0;
    this.result = {};
    this.path = [];
    if (this.__methods) {
      this.__methods.forEach((opts: any) => {
        this.define.apply(this, opts);
      });
    }
  }

  reset(buffer: BufferType) {
    this.buffer = buffer;
    this.offset = 0;
    this.result = {};
    this.path = [];
    return this;
  }

  loop(path: string, fn: ReaderFunction, iterations?: number) {
    let i = 0;
    let _break = false;

    const end = function() {
      _break = true;
    };

    while (!_break && (iterations !== undefined ? iterations-- : true)) {
      this.path.push(path);
      this.path.push(i++);
      fn.call(this, end);
      this.path.pop();
      this.path.pop();
    }
    return this;
  }

  static define(name: string, fn: ReaderFunction, namespace?: string, _proto?: any) {
    _proto = _proto || Reader;

    if (!_proto.prototype.__methods) {
      _proto.prototype.__methods = [];
    }
    _proto.prototype.__methods.push([name, fn, namespace]);
  }

  define(name: string, fn: ReaderFunction, namespace?: string) {
    _.set(
      this,
      namespace ? namespace + "." + name : name,
      _.bind(_read, this, fn)
    );
  }

  skip(bytes: number) {
    this.offset += bytes;
    return this;
  }

  demand(bytes: number) {
    if (this.offset + bytes > this.buffer.length) {
      throw new RangeError("Trying to access beyond buffer length");
    }
    return this;
  }
}

Object.defineProperty(Reader.prototype, "context", {
  enumerable: true,
  get() {
    if (this.path.length === 0) {
      return this.result;
    }
    return _.get(this.result, this.path);
  },
  set(v) {
    _.set(this.result, this.path, v);
  },
});

function _read(this: Reader, fn: ReaderFunction, path: string | string[]) {
  let r, i;
  let args: any;
  const len = arguments.length;
  const _path = typeof path === "string" ? [path] : path;

  for (i = 0; i < _path.length; i++) {
    this.path.push(_path[i]);
  }

  args =
    len > 2
      ? Array.from({ length: len - 2 }).map((_, i) => arguments[i + 2])
      : [];

  r = fn.apply(this, args);

  if (r !== undefined) {
    if (this.path.length) {
      _.set(this.result, this.path, r);
    } else {
      this.result = r;
    }
  }

  for (i = 0; i < _path.length; i++) {
    this.path.pop();
  }

  return this;
}

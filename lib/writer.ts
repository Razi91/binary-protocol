import { WriterFunction } from ".";
import _ from "lodash";

export type WriterOptions = {
  bufferSize: number;
  resultCopy: boolean;
};

export default class Writer {
  buffer: Buffer;
  offset: number;
  id: string;
  options: WriterOptions;
  __methods!: any[];

  constructor(options?: Partial<WriterOptions>) {
    this.id = _.uniqueId("writer_");

    this.options = _.defaults(options || {}, {
      bufferSize: 8 * 1024,
      resultCopy: false, // set to true if you want write().result to return a copy of the Buffer instead of the slice
    });

    this.buffer = new Buffer(Math.ceil(this.options.bufferSize / 8192) * 8192); // round to 8k blocks
    this.offset = 0;

    if (this.__methods) {
      this.__methods.forEach((opts) => {
        this.define.apply(this, opts);
      });
    }
  }

  static define(
    name: string,
    fn: WriterFunction,
    namespace: string,
    _proto: any
  ) {
    _proto = _proto || Writer;

    if (!_proto.prototype.__methods) {
      _proto.prototype.__methods = [];
    }
    _proto.prototype.__methods.push([name, fn, namespace]);
  }

  define(name: string, fn: WriterFunction, namespace: string) {
    _.set(
      this,
      namespace ? namespace + "." + name : name,
      _.bind(_write, this, fn)
    );
  }

  _growBuffer(_newSize: number) {
    const newSize = Math.ceil(_newSize / 8192) * 8192; // round to 8k
    const _b = new Buffer(newSize);
    this.buffer.copy(_b, 0, 0, this.offset);
    this.buffer = _b;
  }

  demand(bytes: number) {
    if (this.offset + bytes > this.buffer.length) {
      this._growBuffer(
        Math.max(this.offset + bytes, this.buffer.length * 1.25)
      );
    }
    return this;
  }

  skip(bytes: number) {
    this.offset += bytes;
    return this;
  }

  loop(values: any[], fn: WriterFunction, iterations?: number) {
    var _break = false,
      i = 0;

    var end = function() {
      _break = true;
    };

    if (iterations === undefined) {
      iterations = values.length;
    }

    while (!_break && (iterations !== undefined ? iterations-- : true)) {
      fn.call(this, values[i++], end);
    }

    return this;
  }

  reset() {
    this.offset = 0;
    return this;
  }
}

function _write(this: Writer, fn: WriterFunction, ...args: any) {
  fn.apply(this, args);
  return this;
}

/*
Writer.prototype.prepend = function (offset, fn) {
    var _b = new Buffer(this.offset - offset);
    this.buffer.copy(_b, 0, offset, this.offset);
    this.offset = offset;
    fn.apply(this, Array.prototype.slice.call(arguments, 2));
    this.demand(_b.length);
    _b.copy(this.buffer, this.offset, 0);
    this.offset += _b.length;
};
*/

Object.defineProperty(Writer.prototype, "result", {
  enumerable: true,
  get: function() {
    var copy;
    if (this.options.resultCopy) {
      copy = new Buffer(this.offset);
      this.buffer.copy(copy, 0, 0, this.offset);
      return copy;
    }
    return this.buffer.slice(0, this.offset);
  },
});

import Long from 'long'

export function dezigzag (value: number) {
    return (value >>> 1) ^ -(value & 1);
};

export function read (buffer: Buffer, offset: number) {
    var byte;
    var result = 0;
    var position = offset || 0;
    var shift = 0;

    do {
        byte = buffer[position++];
        if (byte === undefined) {
            throw new RangeError('ProtocolBuffer: Truncated message');
        }
        if (shift < 7 * 5) { // negative int32 is always 10 bytes according to spec
            result |= (byte & 0x7F) << shift;
        }
        shift += 7;
        if (shift > 7 * 10) {
            throw new Error('ProtocolBuffer: Malformed varint');
        }
    } while ((byte & 0x80) !== 0);

    return { length: (position - offset), value: result >>> 0 };
};

export function dezigzag64 (value: Long) {
    return value.toSigned().shiftRightUnsigned(1).xor(value.and(Long.fromNumber(1)).negate());
};

export function read64 (buffer: Buffer, offset: number) {
    var byte;
    var result = Long.ZERO;
    var position = offset || 0;
    var shift = 0;

    do {
        byte = buffer[position++];
        if (byte === undefined) {
            throw new RangeError('ProtocolBuffer: Truncated message');
        }
        result = result.add(Long.fromNumber(byte & 0x7F).shiftLeft(shift));
        shift += 7;
        if (shift > 7 * 10) {
            throw new Error('ProtocolBuffer: Malformed varint');
        }
    } while ((byte & 0x80) !== 0);

    return { length: (position - offset), value: result.toUnsigned() };
};

export  function zigzag (value: number) {
    return (value << 1) ^ (value >> 31);
};

export  function write (buffer: Buffer, number: number, offset: number) {
    var position = offset || 0;

    offset = offset || 0;

    number = number >>> 0;

    while ((number & ~0x7F) >>> 0) {
        buffer[position] = ((number & 0xFF) >>> 0) | 0x80;
        number = number >>> 7;
        position++;
    }

    buffer[position] = number;

    return position - offset + 1;
};

export function zigzag64 (value: Long) {
    return value.shiftLeft(1).xor(value.shiftRight(63));
};

export function write64 (buffer: Buffer, _number: Long, _offset: number) {
    var position = _offset || 0;
    const L1 = Long.fromNumber(~0x7F);
    const L2 = Long.fromNumber(0xFF);
    const L3 = Long.fromNumber(0x80);

    const offset = _offset || 0;
    let number = _number.toUnsigned();

    while (number.and(L1).greaterThan(Long.ZERO)) {
        buffer[position] = number.and(L2).or(L3).toNumber();
        number = number.shiftRightUnsigned(7);
        position++;
    }

    buffer[position] = number.toNumber();

    return position - offset + 1;
};

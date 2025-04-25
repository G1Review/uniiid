# uniiid

**Uniiid** is a tiny, zero-dependency library for generating and parsing human-friendly identifiers made of digits and a limited set of Latin letters. IDs are case-insensitive, may include hyphens for readability, and (optionally) can be prefixed with a rolling timestamp to guard against collisions over time.

- **Zero dependencies**, works in Node.js and modern browsers
- **Voice-friendly**: letters chosen to avoid confusion across Latin and Cyrillic alphabets
- **Optional crypto mode** for high-entropy, cryptographically secure IDs
- **Optional timestamp prefixes** to embed “minutes since start” in each ID

## Basic Example

```js
const ProductId = createID("x9-99");
const randomId = ProductId.random(); // "A0-32"
const invalidId = ProductId.parse(123); // null
const validId = ProductId.parse(" - A 0 3 2 - "); // "A0-32"
```

## Crypto with timestamp

IDs with timestamp prefixes is a good way for database performance optimization.

```js
const SessionId = createID(
  "XXX9-XXXX-XXXX-9XXX-X999-999X-999X-999X-9999-99XX", // Long ID for ensure at least 128 bits of entropy
  true, // Use Crypto API
  new Date(process.env.UNIIID_TIMESTAMP_DATE_OF_START) // Pass start date in past for timestamps, ex "2023-01-01T00:00:00Z"
);

const id = SessionId.random(); // "AAA1217775-YLY4-WYMW-KALD-1KXL-N628-040T-092K-223R-4124-06AA"
const date = SessionId.parseTimestamp(id); // Date(2025-04-25T16:15:00.000Z)
```


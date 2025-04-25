# uniiid

This library provides generation and parsing of identifiers composed of digits and limited set of latin letters. Goal is ensure easy and reliable voice transmission across different Latin and Cyrillic alphabet language groups. Identifiers is case insensitive and can include hyphens for better readability.

Example:

```js
const ProductId = createId("x9-xxx-99-99-x9");
const randomId = ProductId.random(); // "A0-TWA-45-32-M7"
const invalidId = ProductId.parse("123"); // null
const validId = ProductId.parse(" - - - K0TWA4532M7 - - - "); // "K0-TWA-45-32-M7"
```

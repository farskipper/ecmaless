# AST Spec
All AST nodes will have a `loc` property. It's identical to the [estree loc](https://github.com/estree/estree/blob/master/spec.md#node-objects).

These examples omit the `loc` property for brevity.

### Literals

```js
100.25
{"type": "Number", "value": 100.25}

"Hi!"
{"type": "String", "value": "Hi!"}

foo
{"type": "Identifier", "value": "foo"}
```

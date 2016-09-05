module.exports = function (mdefs, main) {
    var loadModule = function loadModule(mid) {
        var m = mdefs[mid];
        var args = [];
        var i = 1;
        while (i < m.length) {
            args.push(require(m[i]));
            i++;
        }
        return m[0].apply(void 0, args);
    };
    var cache = {};
    var require = function (mid) {
        if (!cache.hasOwnProperty(mid)) {
            cache[mid] = loadModule(mid);
        }
        return cache[mid];
    };
    return require(main);
}([
    [
        function (core, map, $$$ecmaless$$$get, $$$ecmaless$$$set) {
            var stdlib = core;
            $$$ecmaless$$$set(stdlib, 'map', map);
            return stdlib;
        },
        3,
        4,
        1,
        2
    ],
    [
        function (o) {
            return o['get'];
        },
        9
    ],
    [
        function (o) {
            return o['set'];
        },
        9
    ],
    [function () {
            var module = { 'exports': {} };
            var objectToString = Object.prototype.toString;
            var hasOwnProperty = Object.prototype.hasOwnProperty;
            var funcToString = Function.prototype.toString;
            var objectCtorString = funcToString.call(Object);
            var isObject = function (v) {
                var type = typeof v;
                return !!v && (type == 'object' || type == 'function');
            };
            var isTag = function (v, tag) {
                return !!v && typeof v == 'object' && objectToString.call(v) === tag;
            };
            var isJSNumber = function (v) {
                return typeof v == 'number' || isTag(v, '[object Number]');
            };
            var isNaN = function (v) {
                return isJSNumber(v) && v != +v;
            };
            var isHostObject = function (v) {
                var result = false;
                if (v != null && typeof v.toString != 'function') {
                    try {
                        result = !!(v + '');
                    } catch (e) {
                    }
                }
                return result;
            };
            var nativeGetPrototype = Object.getPrototypeOf;
            var getPrototype = function (v) {
                return nativeGetPrototype(Object(v));
            };
            var stdlib = {};
            stdlib.isNil = function (v) {
                return v === void 0 || v === null || isNaN(v);
            };
            stdlib.isNumber = function (v) {
                return isJSNumber(v) && v == +v;
            };
            stdlib.isString = function (v) {
                return typeof v == 'string' || !stdlib.isArray(v) && isTag(v, '[object String]');
            };
            stdlib.isBoolean = function (v) {
                return v === true || v === false || isTag(v, '[object Boolean]');
            };
            stdlib.isArray = Array.isArray;
            stdlib.isStruct = function (v) {
                if (!isTag(v, '[object Object]') || isHostObject(v)) {
                    return false;
                }
                var proto = getPrototype(v);
                if (proto === null) {
                    return true;
                }
                var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
                return typeof Ctor == 'function' && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
            };
            stdlib.isFunction = function (v) {
                var tag = isObject(v) ? objectToString.call(v) : '';
                return tag === '[object Function]' || tag === '[object GeneratorFunction]';
            };
            stdlib.truthy = function (v) {
                return !stdlib.isNil(v) && v !== false;
            };
            stdlib.has = function (obj, key) {
                return obj != null && hasOwnProperty.call(obj, key);
            };
            stdlib.get = function (o, key, deflt) {
                if (stdlib.has(o, key)) {
                    return o[key];
                }
                return deflt;
            };
            stdlib.iterate = function (o, fn) {
                if (stdlib.isArray(o)) {
                    var i;
                    for (i = 0; i < o.length; i++) {
                        if (!stdlib.truthy(fn(o[i], i, o))) {
                            return;
                        }
                    }
                }
                if (stdlib.isStruct(o)) {
                    var key;
                    for (key in o) {
                        if (stdlib.has(o, key)) {
                            if (!stdlib.truthy(fn(o[key], key, o))) {
                                return;
                            }
                        }
                    }
                }
            };
            stdlib['||'] = function (a, b) {
                return stdlib.truthy(a) ? a : b;
            };
            stdlib['&&'] = function (a, b) {
                return stdlib.truthy(a) && stdlib.truthy(b) ? b : a;
            };
            stdlib['!'] = function (a) {
                return !stdlib.truthy(a);
            };
            stdlib.set = function (o, key, value) {
                o[key] = value;
                return value;
            };
            stdlib.push = function (o, value) {
                if (!stdlib.isArray(o)) {
                    throw new Error('push only works on Arrays');
                }
                o.push(value);
                return value;
            };
            module.exports = stdlib;
            return module.exports;
        }],
    [
        function (isStruct, iterate, $$$ecmaless$$$get, $$$ecmaless$$$set, $$$ecmaless$$$truthy, push) {
            return function (obj, ifn) {
                if ($$$ecmaless$$$truthy(isStruct(obj))) {
                    var r = {};
                    iterate(obj, function (v, k, o) {
                        $$$ecmaless$$$set(r, k, ifn(v, k, o));
                        return true;
                    });
                    return r;
                }
                var r = [];
                iterate(obj, function (v, k, o) {
                    push(r, ifn(v, k, o));
                    return true;
                });
                return r;
            };
        },
        5,
        6,
        1,
        2,
        7,
        8
    ],
    [
        function (o) {
            return o['isStruct'];
        },
        9
    ],
    [
        function (o) {
            return o['iterate'];
        },
        9
    ],
    [
        function (o) {
            return o['truthy'];
        },
        9
    ],
    [
        function (o) {
            return o['push'];
        },
        9
    ],
    [function () {
            var module = { 'exports': {} };
            var objectToString = Object.prototype.toString;
            var hasOwnProperty = Object.prototype.hasOwnProperty;
            var funcToString = Function.prototype.toString;
            var objectCtorString = funcToString.call(Object);
            var isObject = function (v) {
                var type = typeof v;
                return !!v && (type == 'object' || type == 'function');
            };
            var isTag = function (v, tag) {
                return !!v && typeof v == 'object' && objectToString.call(v) === tag;
            };
            var isJSNumber = function (v) {
                return typeof v == 'number' || isTag(v, '[object Number]');
            };
            var isNaN = function (v) {
                return isJSNumber(v) && v != +v;
            };
            var isHostObject = function (v) {
                var result = false;
                if (v != null && typeof v.toString != 'function') {
                    try {
                        result = !!(v + '');
                    } catch (e) {
                    }
                }
                return result;
            };
            var nativeGetPrototype = Object.getPrototypeOf;
            var getPrototype = function (v) {
                return nativeGetPrototype(Object(v));
            };
            var stdlib = {};
            stdlib.isNil = function (v) {
                return v === void 0 || v === null || isNaN(v);
            };
            stdlib.isNumber = function (v) {
                return isJSNumber(v) && v == +v;
            };
            stdlib.isString = function (v) {
                return typeof v == 'string' || !stdlib.isArray(v) && isTag(v, '[object String]');
            };
            stdlib.isBoolean = function (v) {
                return v === true || v === false || isTag(v, '[object Boolean]');
            };
            stdlib.isArray = Array.isArray;
            stdlib.isStruct = function (v) {
                if (!isTag(v, '[object Object]') || isHostObject(v)) {
                    return false;
                }
                var proto = getPrototype(v);
                if (proto === null) {
                    return true;
                }
                var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
                return typeof Ctor == 'function' && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
            };
            stdlib.isFunction = function (v) {
                var tag = isObject(v) ? objectToString.call(v) : '';
                return tag === '[object Function]' || tag === '[object GeneratorFunction]';
            };
            stdlib.truthy = function (v) {
                return !stdlib.isNil(v) && v !== false;
            };
            stdlib.has = function (obj, key) {
                return obj != null && hasOwnProperty.call(obj, key);
            };
            stdlib.get = function (o, key, deflt) {
                if (stdlib.has(o, key)) {
                    return o[key];
                }
                return deflt;
            };
            stdlib.iterate = function (o, fn) {
                if (stdlib.isArray(o)) {
                    var i;
                    for (i = 0; i < o.length; i++) {
                        if (!stdlib.truthy(fn(o[i], i, o))) {
                            return;
                        }
                    }
                }
                if (stdlib.isStruct(o)) {
                    var key;
                    for (key in o) {
                        if (stdlib.has(o, key)) {
                            if (!stdlib.truthy(fn(o[key], key, o))) {
                                return;
                            }
                        }
                    }
                }
            };
            stdlib['||'] = function (a, b) {
                return stdlib.truthy(a) ? a : b;
            };
            stdlib['&&'] = function (a, b) {
                return stdlib.truthy(a) && stdlib.truthy(b) ? b : a;
            };
            stdlib['!'] = function (a) {
                return !stdlib.truthy(a);
            };
            stdlib.set = function (o, key, value) {
                o[key] = value;
                return value;
            };
            stdlib.push = function (o, value) {
                if (!stdlib.isArray(o)) {
                    throw new Error('push only works on Arrays');
                }
                o.push(value);
                return value;
            };
            module.exports = stdlib;
            return module.exports;
        }]
], 0);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmVjbWFsZXNzIiwic3JjL21hcC5lY21hbGVzcyJdLCJuYW1lcyI6WyJjb3JlIiwibWFwIiwic3RkbGliIiwibW9kdWxlIiwiZXhwb3J0cyIsImlzU3RydWN0IiwiaXRlcmF0ZSIsInB1c2giLCJvYmoiLCJpZm4iLCJyIiwidiIsImsiLCJvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7a0JBQ0lBLEksRUFDQUMsRztnQkFFQUMsTSxHQUFTRixJOzhCQUNiRSxNLEVBQU8sSyxFQUFNRCxHO1lBQ2IsT0FBQUMsTUFBQSxDOztRQUxTLEM7UUFDRCxDOzs7Ozs7Ozs7Ozs7Ozs7O0lBREM7QUFBQSxnQkFBQUMsTUFBQSxLLFdBQUE7QUFBQSxZLCtDQUFBO0FBQUEsWSxxREFBQTtBQUFBLFksK0NBQUE7QUFBQSxZLGlEQUFBO0FBQUEsWTs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOzs7Ozs7Ozs7Y0FBQTtBQUFBLFksK0NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWSxnQkFBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZLCtCQUFBO0FBQUEsWTs7Ozs7Ozs7OztjQUFBO0FBQUEsWTs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7Ozs7O2NBQUE7QUFBQSxZOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOzs7Y0FBQTtBQUFBLFk7Ozs7OztjQUFBO0FBQUEsWSx3QkFBQTtBQUFBLG1CQUFBQSxNQUFBLENBQUFDLE9BQUE7QUFBQSxVOztrQkNBRkMsUSxFQUVDQyxPLDhEQVlJQyxJOzZCQWZSQyxHLEVBQUtDLEc7eUNBQ0ZKLFEsQ0FBU0csRzt3QkFDSkUsQztvQkFDSkosTyxDQUNJRSxHLFlBQ0lHLEMsRUFBR0MsQyxFQUFHQyxDOzBDQUNOSCxDLEVBQUVFLEMsRUFBS0gsRyxDQUFJRSxDLEVBQUdDLEMsRUFBR0MsQzt3QkFDakIsWTs7MkJBR0RILEM7O29CQUNQQSxDO2dCQUNKSixPLENBQ0lFLEcsWUFDSUcsQyxFQUFHQyxDLEVBQUdDLEM7b0JBQ05OLEksQ0FBS0csQyxFQUFHRCxHLENBQUlFLEMsRUFBR0MsQyxFQUFHQyxDO29CQUNsQixZOztnQkFHUixPQUFBSCxDQUFBLEM7OztRQWxCRyxDO1FBRUMsQzs7OztRQVlJLEM7O0lBZEw7QUFBQSxrQkFBQUcsQ0FBQTtBQUFBLG1CQUFBQSxDQUFBO0FBQUE7QUFBQTtBQUFBLEs7SUFFQztBQUFBLGtCQUFBQSxDQUFBO0FBQUEsbUJBQUFBLENBQUE7QUFBQTtBQUFBO0FBQUEsSzs7Ozs7OztJQVlJO0FBQUEsa0JBQUFBLENBQUE7QUFBQSxtQkFBQUEsQ0FBQTtBQUFBO0FBQUE7QUFBQSxLO0lBQUE7QUFBQSxnQkFBQVYsTUFBQSxLLFdBQUE7QUFBQSxZLCtDQUFBO0FBQUEsWSxxREFBQTtBQUFBLFksK0NBQUE7QUFBQSxZLGlEQUFBO0FBQUEsWTs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOzs7Ozs7Ozs7Y0FBQTtBQUFBLFksK0NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWSxnQkFBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZLCtCQUFBO0FBQUEsWTs7Ozs7Ozs7OztjQUFBO0FBQUEsWTs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7Ozs7O2NBQUE7QUFBQSxZOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O2NBQUE7QUFBQSxZOztjQUFBO0FBQUEsWTs7Y0FBQTtBQUFBLFk7O2NBQUE7QUFBQSxZOzs7Y0FBQTtBQUFBLFk7Ozs7OztjQUFBO0FBQUEsWSx3QkFBQTtBQUFBLG1CQUFBQSxNQUFBLENBQUFDLE9BQUE7QUFBQSxVIn0=

var _ = require("lodash");

module.exports = function assertT(actual, expected, loc){
    var aTag = actual && actual.tag;
    var eTag = expected && expected.tag;

    if(aTag !== eTag){
        var err = new TypeError("expected `" + eTag + "` but was `" + aTag + "`");
        //TODO point to `loc`
        err.ecmaless = {
            expected: expected,
            actual: actual,
            loc: loc,
        };
        throw err;
    }

    if(aTag === "Fn"){
        if(_.size(actual.params) !== _.size(expected.params)){
            throw new TypeError("Expected "  + _.size(expected.params) + " params but was " + _.size(actual.params));
        }
        _.each(actual.params, function(param, i){
            var exp = expected.params[i];
            assertT(param, exp, param.loc || exp.loc || loc);
        });
    }

    if(aTag === "Struct"){
        if(!_.isEqual(_.keys(actual.by_key), _.keys(expected.by_key))){
            //TODO better error
            throw new TypeError("TODO better error Bad Struct keys");
        }
        _.each(actual.by_key, function(v, key){
            var act = actual.by_key[key];
            var exp = expected.by_key[key];
            assertT(act, exp, act.loc || exp.loc || loc);
        });
    }
};

var _ = require("lodash");

module.exports = function assertT(ctx, actual, expected, loc){
    var aTag = actual && actual.tag;
    var eTag = expected && expected.tag;

    if(aTag !== eTag){
        throw ctx.error(loc, "expected `" + eTag + "` but was `" + aTag + "`");
    }

    if(aTag === "Fn"){
        if(_.size(actual.params) !== _.size(expected.params)){
            throw ctx.error(loc, "Expected "  + _.size(expected.params) + " params but was " + _.size(actual.params));
        }
        _.each(actual.params, function(param, i){
            var exp = expected.params[i];
            assertT(ctx, param, exp, param.loc || exp.loc || loc);
        });
    }

    if(aTag === "Struct"){
        if(!_.isEqual(_.keys(actual.by_key), _.keys(expected.by_key))){
            throw ctx.error(actual.loc, "TODO better error Bad Struct keys");
        }
        _.each(actual.by_key, function(v, key){
            var act = actual.by_key[key];
            var exp = expected.by_key[key];
            assertT(ctx, act, exp, act.loc || exp.loc || loc);
        });
    }
};

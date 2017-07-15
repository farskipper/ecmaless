module.exports = function(actual, expected, loc){
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
};

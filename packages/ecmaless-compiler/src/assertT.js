module.exports = function(actual, expected, loc){
    var aTag = actual && actual[0];
    var eTag = expected && expected[0];

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

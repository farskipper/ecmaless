// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

var flatten = function(toFlatten){
    var isArray = Object.prototype.toString.call(toFlatten) === '[object Array]';

    if (isArray && toFlatten.length > 0) {
        var head = toFlatten[0];
        var tail = toFlatten.slice(1);

        return flatten(head).concat(flatten(tail));
    } else {
        return [].concat(toFlatten);
    }
};

var noop = function(){};
var noopArr = function(){return [];};
var idArr = function(d){return [d[0]];};
var concatArr = function(i, no_wrap){
    if(no_wrap){
        return function(d){
            return d[0].concat(d[i]);
        };
    }
    return function(d){
        return d[0].concat([d[i]]);
    };
};
var idN = function(n){
    return function(d){
        return d[n];
    };
};

var mkLoc = function(d){
    var loc = {};
    var elms = flatten(d);
    var i = 0;
    while(i < elms.length){
        if(elms[i] && elms[i].loc){
            if(!loc.start){
                loc.start = elms[i].loc.start;
                loc.source = elms[i].loc.source;
            }
            loc.end = elms[i].loc.end;
        }
        i += 1;
    }
    return loc;
};

var reserved = {};

var tok = function(type, value){
    if((type === "SYMBOL") && typeof value === "string"){
        reserved[value] = true;
    }
    return {test: function(x){
        if(!x || x.type !== type){
            return false;
        }
        if(value){
            return x.src === value;
        }
        return true;
    }};
};
var tok_NUMBER = tok("NUMBER");
var tok_STRING = tok("STRING");
var tok_DOCSTRING = tok("DOCSTRING");
var tok_SYMBOL = tok("SYMBOL");
var tok_TYPE = tok("TYPE");
var tok_INDENT = tok("INDENT");
var tok_DEDENT = tok("DEDENT");
var tok_NL = tok("NEWLINE");
var tok_COLON = tok("RAW", ":");
var tok_COMMA = tok("RAW", ",");
var tok_DOT = tok("RAW", ".");
var tok_QUESTION = tok("RAW", "?");
var tok_DOTDOTDOT = tok("RAW", "...");
var tok_EQ = tok("RAW", "=");
var tok_OPEN_PN = tok("RAW", "(");
var tok_CLOSE_PN = tok("RAW", ")");
var tok_OPEN_SQ = tok("RAW", "[");
var tok_CLOSE_SQ = tok("RAW", "]");
var tok_OPEN_CU = tok("RAW", "{");
var tok_CLOSE_CU = tok("RAW", "}");

var tok_import = tok("SYMBOL", "import");
var tok_export = tok("SYMBOL", "export");

var tok_def = tok("SYMBOL", "def");

var tok_fn = tok("SYMBOL", "fn");
var tok_return = tok("SYMBOL", "return");

var tok_if = tok("SYMBOL", "if");
var tok_else = tok("SYMBOL", "else");

var tok_cond = tok("SYMBOL", "cond");
var tok_case = tok("SYMBOL", "case");

var tok_try = tok("SYMBOL", "try");
var tok_catch = tok("SYMBOL", "catch");
var tok_finally = tok("SYMBOL", "finally");

var tok_while = tok("SYMBOL", "while");
var tok_break = tok("SYMBOL", "break");
var tok_continue = tok("SYMBOL", "continue");

var tok_nil = tok("SYMBOL", "nil");
var tok_true = tok("SYMBOL", "true");
var tok_false = tok("SYMBOL", "false");

var tok_or = tok("SYMBOL", "or");
var tok_and = tok("SYMBOL", "and");
var tok_not = tok("SYMBOL", "not");

var tok_ann = tok("SYMBOL", "ann");
var tok_alias = tok("SYMBOL", "alias");
var tok_enum = tok("SYMBOL", "enum");
var tok_Fn = tok("TYPE", "Fn");

var isReserved = function(src){
    return reserved[src] === true;
};

var tok_EQEQ = tok("RAW", "==");
var tok_NOTEQ = tok("RAW", "!=");
var tok_LT = tok("RAW", "<");
var tok_LTEQ = tok("RAW", "<=");
var tok_GT = tok("RAW", ">");
var tok_GTEQ = tok("RAW", ">=");
var tok_PLUS = tok("RAW", "+");
var tok_PLUSPLUS = tok("RAW", "++");
var tok_MINUS = tok("RAW", "-");
var tok_TIMES = tok("RAW", "*");
var tok_DIVIDE = tok("RAW", "/");
var tok_MODULO = tok("RAW", "%");

var mkType = function(d, type, value){
    return {
        loc: mkLoc(d),
        type: type,
        value: value,
    };
};

var mkMemberExpression = function(loc, method, object, path){
    return {
        loc: loc,
        type: "MemberExpression",
        object: object,
        path: path,
        method: method,
    };
};

var unaryOp = function(d){
    return {
        loc: mkLoc(d),
        type: "UnaryOperator",
        op: d[0].src,
        arg: d[1],
    };
};

var infixOp = function(d){
    return {
        loc: mkLoc(d),
        type: "InfixOperator",
        op: d[1].src,
        left: d[0],
        right: d[2],
    };
};


var tryCatchMaker = function(i_id, i_catch, i_finally){
    return function(d){
        return {
            loc: mkLoc(d),
            type: "TryCatch",
            try_block: d[1],
            catch_id: i_id > 0 ? d[i_id] : null,
            catch_block: i_catch > 0 ? d[i_catch] : null,
            finally_block: i_finally > 0 ? d[i_finally] : null,
        };
    };
};

var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main$ebnf$1", "symbols": ["NL"], "postprocess": id},
    {"name": "main$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "main$ebnf$2$subexpression$1$ebnf$1", "symbols": ["Import"]},
    {"name": "main$ebnf$2$subexpression$1$ebnf$1", "symbols": ["main$ebnf$2$subexpression$1$ebnf$1", "Import"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main$ebnf$2$subexpression$1", "symbols": [tok_import, tok_COLON, "NL", "INDENT", "main$ebnf$2$subexpression$1$ebnf$1", "DEDENT", "NL"]},
    {"name": "main$ebnf$2", "symbols": ["main$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "main$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "main$ebnf$3", "symbols": ["Statement_list"], "postprocess": id},
    {"name": "main$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "main$ebnf$4$subexpression$1", "symbols": [tok_export, "Expression", "NL"]},
    {"name": "main$ebnf$4", "symbols": ["main$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "main$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "main", "symbols": ["main$ebnf$1", "main$ebnf$2", "main$ebnf$3", "main$ebnf$4"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Module",
                "import": (d[1] && d[1][4]) || [],
                body: d[2] || [],
                "export": d[3] && d[3][1],
            };
        } },
    {"name": "Import", "symbols": ["Identifier", "String", "NL"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Import",
                id: d[0],
                path: d[1]
            };
        } },
    {"name": "Statement_list", "symbols": ["Statement", "NL"], "postprocess": idArr},
    {"name": "Statement_list", "symbols": ["Statement_list", "Statement", "NL"], "postprocess": concatArr(1)},
    {"name": "Statement", "symbols": ["Define"], "postprocess": id},
    {"name": "Statement", "symbols": ["ExpressionStatement"], "postprocess": id},
    {"name": "Statement", "symbols": ["Return"], "postprocess": id},
    {"name": "Statement", "symbols": ["If"], "postprocess": id},
    {"name": "Statement", "symbols": ["While"], "postprocess": id},
    {"name": "Statement", "symbols": ["Break"], "postprocess": id},
    {"name": "Statement", "symbols": ["Continue"], "postprocess": id},
    {"name": "Statement", "symbols": ["Cond"], "postprocess": id},
    {"name": "Statement", "symbols": ["Case"], "postprocess": id},
    {"name": "Statement", "symbols": ["TryCatch"], "postprocess": id},
    {"name": "Statement", "symbols": ["Annotation"], "postprocess": id},
    {"name": "Statement", "symbols": ["TypeAlias"], "postprocess": id},
    {"name": "Statement", "symbols": ["Enum"], "postprocess": id},
    {"name": "ExpressionStatement", "symbols": ["Expression"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "ExpressionStatement",
                expression: d[0]
            };
        } },
    {"name": "Return$ebnf$1", "symbols": ["Expression"], "postprocess": id},
    {"name": "Return$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Return", "symbols": [tok_return, "Return$ebnf$1"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Return",
                expression: d[1]
            };
        } },
    {"name": "Define$ebnf$1$subexpression$1", "symbols": [tok_EQ, "Expression"]},
    {"name": "Define$ebnf$1", "symbols": ["Define$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Define$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Define", "symbols": [tok_def, "Identifier", "Define$ebnf$1"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Define",
                id: d[1],
                init: d[2] ? d[2][1] : void 0,
            };
        } },
    {"name": "If$ebnf$1$subexpression$1$subexpression$1", "symbols": ["If"]},
    {"name": "If$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Block"]},
    {"name": "If$ebnf$1$subexpression$1", "symbols": ["NL", tok_else, "If$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "If$ebnf$1", "symbols": ["If$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "If$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "If", "symbols": [tok_if, "Expression", "Block", "If$ebnf$1"], "postprocess":  function(d){
            var else_block = d[3] && d[3][2] && d[3][2][0];
            if(else_block && else_block.type === "Block"){
                else_block = else_block;
            }
            return {
                loc: mkLoc(d),
                type: "If",
                test: d[1],
                then: d[2],
                "else": else_block
            };
        } },
    {"name": "While", "symbols": [tok_while, "Expression", "Block"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "While",
                test: d[1],
                block: d[2]
            };
        } },
    {"name": "Break", "symbols": [tok_break], "postprocess": function(d){return {loc: d[0].loc, type: "Break"};}},
    {"name": "Continue", "symbols": [tok_continue], "postprocess": function(d){return {loc: d[0].loc, type: "Continue"};}},
    {"name": "Cond$ebnf$1", "symbols": []},
    {"name": "Cond$ebnf$1", "symbols": ["Cond$ebnf$1", "CondBlock"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Cond$ebnf$2$subexpression$1", "symbols": ["ElseBlock", "NL"]},
    {"name": "Cond$ebnf$2", "symbols": ["Cond$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Cond$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Cond", "symbols": [tok_cond, tok_COLON, "NL", "INDENT", "Cond$ebnf$1", "Cond$ebnf$2", "DEDENT"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Cond",
                blocks: d[4],
                "else": d[5] && d[5][0],
            };
        } },
    {"name": "CondBlock", "symbols": ["Expression", "Block", "NL"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "CondBlock",
                test: d[0],
                block: d[1],
            };
        } },
    {"name": "Case$ebnf$1", "symbols": []},
    {"name": "Case$ebnf$1", "symbols": ["Case$ebnf$1", "CaseBlock"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Case$ebnf$2$subexpression$1", "symbols": ["ElseBlock", "NL"]},
    {"name": "Case$ebnf$2", "symbols": ["Case$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Case$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Case", "symbols": [tok_case, "Expression", tok_COLON, "NL", "INDENT", "Case$ebnf$1", "Case$ebnf$2", "DEDENT"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Case",
                to_test: d[1],
                blocks: d[5],
                "else": d[6] && d[6][0],
            };
        } },
    {"name": "CaseBlock", "symbols": ["Expression", "Block", "NL"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "CaseBlock",
                value: d[0],
                block: d[1],
            };
        } },
    {"name": "TryCatch", "symbols": [tok_try, "Block", "NL", tok_catch, "Identifier", "Block"], "postprocess": tryCatchMaker(4, 5, -1)},
    {"name": "TryCatch", "symbols": [tok_try, "Block", "NL", tok_finally, "Block"], "postprocess": tryCatchMaker(-1, -1, 4)},
    {"name": "TryCatch", "symbols": [tok_try, "Block", "NL", tok_catch, "Identifier", "Block", "NL", tok_finally, "Block"], "postprocess": tryCatchMaker(4, 5, 8)},
    {"name": "ElseBlock", "symbols": [tok_else, "Block"], "postprocess": idN(1)},
    {"name": "Block", "symbols": [tok_COLON, "NL", "INDENT", "Statement_list", "DEDENT"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Block",
                body: d[3],
            };
        } },
    {"name": "Annotation", "symbols": [tok_ann, "Identifier", tok_EQ, "TypeExpression"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Annotation",
                id: d[1], 
                def: d[3], 
            };
        } },
    {"name": "TypeAlias", "symbols": [tok_alias, "Type", tok_EQ, "TypeExpression"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "TypeAlias",
                id: d[1],
                value: d[3],
            };
        } },
    {"name": "Enum", "symbols": [tok_enum, "Type", tok_COLON, "NL", "INDENT", "EnumVariant_list", "NL", "DEDENT"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Enum",
                id: d[1],
                variants: d[5],
            };
        } },
    {"name": "EnumVariant_list", "symbols": ["EnumVariant"], "postprocess": idArr},
    {"name": "EnumVariant_list", "symbols": ["EnumVariant_list", "NL", "EnumVariant"], "postprocess": concatArr(2)},
    {"name": "EnumVariant", "symbols": ["Type", tok_OPEN_PN, "TypeExpression_list", tok_CLOSE_PN], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "EnumVariant",
                tag: d[0],
                params: d[2],
            };
        } },
    {"name": "TypeExpression", "symbols": ["Type"], "postprocess": id},
    {"name": "TypeExpression", "symbols": ["TypeVariable"], "postprocess": id},
    {"name": "TypeExpression", "symbols": ["ArrayType"], "postprocess": id},
    {"name": "TypeExpression", "symbols": ["StructType"], "postprocess": id},
    {"name": "TypeExpression", "symbols": ["FunctionType"], "postprocess": id},
    {"name": "Type$ebnf$1", "symbols": ["TypeParams"], "postprocess": id},
    {"name": "Type$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Type", "symbols": [tok_TYPE, "Type$ebnf$1"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Type",
                value: d[0].src,
                params: d[1] || [],
            };
        } },
    {"name": "TypeParams", "symbols": [tok_LT, "TypeExpression_list", tok_GT], "postprocess": idN(1)},
    {"name": "TypeExpression_list", "symbols": [], "postprocess": noopArr},
    {"name": "TypeExpression_list", "symbols": ["TypeExpression_list_body"], "postprocess": id},
    {"name": "TypeExpression_list_body", "symbols": ["TypeExpression"], "postprocess": idArr},
    {"name": "TypeExpression_list_body", "symbols": ["TypeExpression_list_body", "COMMA", "TypeExpression"], "postprocess": concatArr(2)},
    {"name": "TypeVariable", "symbols": ["Identifier"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "TypeVariable",
                value: d[0].value,
            };
        } },
    {"name": "ArrayType$ebnf$1", "symbols": ["ArrayType_body"], "postprocess": id},
    {"name": "ArrayType$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ArrayType", "symbols": [tok_OPEN_SQ, "ArrayType$ebnf$1", tok_CLOSE_SQ], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "ArrayType",
                value: d[1] || [],
            };
        } },
    {"name": "ArrayType_body", "symbols": ["ArrayType_elm"], "postprocess": idArr},
    {"name": "ArrayType_body", "symbols": ["ArrayType_body", "COMMA", "ArrayType_elm"], "postprocess": concatArr(2)},
    {"name": "ArrayType_elm$ebnf$1", "symbols": [tok_DOTDOTDOT], "postprocess": id},
    {"name": "ArrayType_elm$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ArrayType_elm", "symbols": ["TypeExpression", "ArrayType_elm$ebnf$1"], "postprocess":  function(d){
            if(!d[1]){
                return d[0];
            }
            return {
                loc: mkLoc(d),
                type: "DotDotDot",
                value: d[0],
            };
        } },
    {"name": "StructType", "symbols": [tok_OPEN_CU, "KeyValPairsType", tok_CLOSE_CU], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "StructType",
                pairs: d[1],
            };
        } },
    {"name": "KeyValPairsType", "symbols": [], "postprocess": noopArr},
    {"name": "KeyValPairsType", "symbols": ["KeyValPairsType_body"], "postprocess": id},
    {"name": "KeyValPairsType", "symbols": ["NL", "INDENT", "KeyValPairsType_body_nl", "DEDENT", "NL"], "postprocess": idN(2)},
    {"name": "KeyValPairsType_body", "symbols": ["KeyValPairType"], "postprocess": idArr},
    {"name": "KeyValPairsType_body", "symbols": ["KeyValPairsType_body", "COMMA", "KeyValPairType"], "postprocess": concatArr(2)},
    {"name": "KeyValPairsType_body_nl", "symbols": ["KeyValPairType", "COMMA", "NL"], "postprocess": idArr},
    {"name": "KeyValPairsType_body_nl", "symbols": ["KeyValPairsType_body_nl", "KeyValPairType", "COMMA", "NL"], "postprocess": concatArr(1)},
    {"name": "KeyValPairType$subexpression$1", "symbols": ["String"]},
    {"name": "KeyValPairType$subexpression$1", "symbols": ["Number"]},
    {"name": "KeyValPairType$subexpression$1", "symbols": ["Symbol"]},
    {"name": "KeyValPairType$subexpression$1", "symbols": ["AnyKey"]},
    {"name": "KeyValPairType", "symbols": ["KeyValPairType$subexpression$1", tok_COLON, "TypeExpression"], "postprocess":  function(d){
            return [d[0][0], d[2]];
        } },
    {"name": "AnyKey", "symbols": [tok_TIMES], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "AnyKey",
            };
        } },
    {"name": "FunctionType", "symbols": [tok_Fn, "TypeExpression", tok_COLON, "TypeExpression"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "FunctionType",
                params: d[1],
                "return": d[3]
            };
        } },
    {"name": "Expression", "symbols": ["AssignmentExpression"], "postprocess": id},
    {"name": "AssignmentExpression", "symbols": ["ConditionalExpression"], "postprocess": id},
    {"name": "AssignmentExpression", "symbols": ["MemberExpression", tok_EQ, "AssignmentExpression"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "AssignmentExpression",
                op: d[1].src,
                left: d[0],
                right: d[2]
            };
        } },
    {"name": "ConditionalExpression", "symbols": ["exp_or"], "postprocess": id},
    {"name": "ConditionalExpression", "symbols": ["exp_or", tok_QUESTION, "exp_or", tok_COLON, "exp_or"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "ConditionalExpression",
                test: d[0],
                consequent: d[2],
                alternate: d[4],
            };
        } },
    {"name": "exp_or", "symbols": ["exp_and"], "postprocess": id},
    {"name": "exp_or", "symbols": ["exp_or", tok_or, "exp_and"], "postprocess": infixOp},
    {"name": "exp_and", "symbols": ["exp_comp"], "postprocess": id},
    {"name": "exp_and", "symbols": ["exp_and", tok_and, "exp_comp"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_sum"], "postprocess": id},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_EQEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_NOTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_LT, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_LTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_GT, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_comp", "symbols": ["exp_comp", tok_GTEQ, "exp_sum"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_product"], "postprocess": id},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_PLUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_MINUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_sum", "symbols": ["exp_sum", tok_PLUSPLUS, "exp_product"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["UnaryOperator"], "postprocess": id},
    {"name": "exp_product", "symbols": ["exp_product", tok_TIMES, "UnaryOperator"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_DIVIDE, "UnaryOperator"], "postprocess": infixOp},
    {"name": "exp_product", "symbols": ["exp_product", tok_MODULO, "UnaryOperator"], "postprocess": infixOp},
    {"name": "UnaryOperator", "symbols": ["MemberExpression"], "postprocess": id},
    {"name": "UnaryOperator", "symbols": [tok_PLUS, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "UnaryOperator", "symbols": [tok_MINUS, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "UnaryOperator", "symbols": [tok_not, "UnaryOperator"], "postprocess": unaryOp},
    {"name": "MemberExpression", "symbols": ["PrimaryExpression"], "postprocess": id},
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_DOT, "Identifier"], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d), "dot", d[0], d[2]);
        } },
    {"name": "MemberExpression", "symbols": ["MemberExpression", tok_OPEN_SQ, "Expression", tok_CLOSE_SQ], "postprocess":  function(d){
            return mkMemberExpression(mkLoc(d), "index", d[0], d[2]);
        } },
    {"name": "PrimaryExpression", "symbols": ["Number"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["String"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Docstring"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Identifier"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Nil"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Boolean"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Function"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Application"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Array"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": ["Struct"], "postprocess": id},
    {"name": "PrimaryExpression", "symbols": [tok_OPEN_PN, "Expression", tok_CLOSE_PN], "postprocess": idN(1)},
    {"name": "PrimaryExpression", "symbols": ["EnumValue"], "postprocess": id},
    {"name": "Application", "symbols": ["MemberExpression", tok_OPEN_PN, "Expression_list", tok_CLOSE_PN], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Application",
                callee: d[0],
                args: d[2],
            };
        } },
    {"name": "Struct", "symbols": [tok_OPEN_CU, "KeyValPairs", tok_CLOSE_CU], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Struct",
                value: d[1]
            };
        } },
    {"name": "KeyValPairs", "symbols": [], "postprocess": noopArr},
    {"name": "KeyValPairs", "symbols": ["KeyValPairs_body"], "postprocess": id},
    {"name": "KeyValPairs", "symbols": ["NL", "INDENT", "KeyValPairs_body_nl", "DEDENT", "NL"], "postprocess": idN(2)},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPair"], "postprocess": id},
    {"name": "KeyValPairs_body", "symbols": ["KeyValPairs_body", "COMMA", "KeyValPair"], "postprocess": concatArr(2, true)},
    {"name": "KeyValPairs_body_nl", "symbols": ["KeyValPair", "COMMA", "NL"], "postprocess": id},
    {"name": "KeyValPairs_body_nl", "symbols": ["KeyValPairs_body_nl", "KeyValPair", "COMMA", "NL"], "postprocess": concatArr(1, true)},
    {"name": "KeyValPair$subexpression$1", "symbols": ["String"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Number"]},
    {"name": "KeyValPair$subexpression$1", "symbols": ["Symbol"]},
    {"name": "KeyValPair", "symbols": ["KeyValPair$subexpression$1", tok_COLON, "Expression"], "postprocess":  function(d){
            return [d[0][0], d[2]];
        } },
    {"name": "Array", "symbols": [tok_OPEN_SQ, "Expression_list", tok_CLOSE_SQ], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Array",
                value: d[1],
            };
        } },
    {"name": "Expression_list", "symbols": [], "postprocess": noopArr},
    {"name": "Expression_list", "symbols": ["Expression_list_body"], "postprocess": id},
    {"name": "Expression_list", "symbols": ["NL", "INDENT", "Expression_list_body_nl", "DEDENT", "NL"], "postprocess": idN(2)},
    {"name": "Expression_list_body", "symbols": ["Expression"], "postprocess": idArr},
    {"name": "Expression_list_body", "symbols": ["Expression_list_body", "COMMA", "Expression"], "postprocess": concatArr(2)},
    {"name": "Expression_list_body_nl$ebnf$1", "symbols": ["NL"], "postprocess": id},
    {"name": "Expression_list_body_nl$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Expression_list_body_nl", "symbols": ["Expression", "Expression_list_body_nl$ebnf$1", "COMMA", "NL"], "postprocess": idArr},
    {"name": "Expression_list_body_nl$ebnf$2", "symbols": ["NL"], "postprocess": id},
    {"name": "Expression_list_body_nl$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Expression_list_body_nl", "symbols": ["Expression_list_body_nl", "Expression", "Expression_list_body_nl$ebnf$2", "COMMA", "NL"], "postprocess": concatArr(1)},
    {"name": "Function", "symbols": [tok_fn, "Params", "Block"], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "Function",
                params: d[1],
                block: d[2],
            };
        } },
    {"name": "Params", "symbols": ["Identifier"], "postprocess": id},
    {"name": "Params", "symbols": [tok_OPEN_SQ, tok_CLOSE_SQ], "postprocess": noopArr},
    {"name": "Params$ebnf$1", "symbols": ["COMMA"], "postprocess": id},
    {"name": "Params$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Params", "symbols": [tok_OPEN_SQ, "Params_body", "Params$ebnf$1", tok_CLOSE_SQ], "postprocess": idN(1)},
    {"name": "Params_body", "symbols": ["Param"], "postprocess": idArr},
    {"name": "Params_body", "symbols": ["Params_body", "COMMA", "Param"], "postprocess": concatArr(2)},
    {"name": "Param$ebnf$1", "symbols": [tok_DOTDOTDOT], "postprocess": id},
    {"name": "Param$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Param", "symbols": ["Identifier", "Param$ebnf$1"], "postprocess":  function(d){
            if(!d[1]){
                return d[0];
            }
            return {
                loc: mkLoc(d),
                type: "DotDotDot",
                value: d[0],
            };
        } },
    {"name": "EnumValue$ebnf$1$subexpression$1", "symbols": ["Type", tok_DOT]},
    {"name": "EnumValue$ebnf$1", "symbols": ["EnumValue$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "EnumValue$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "EnumValue", "symbols": ["EnumValue$ebnf$1", "Type", tok_OPEN_PN, "Expression_list", tok_CLOSE_PN], "postprocess":  function(d){
            return {
                loc: mkLoc(d),
                type: "EnumValue",
                enum: d[0] && d[0][0],
                tag : d[1],
                params: d[3],
            };
        } },
    {"name": "Number", "symbols": [tok_NUMBER], "postprocess":  function(d){
            return mkType(d, "Number", parseFloat(d[0].src) || 0);
        } },
    {"name": "String", "symbols": [tok_STRING], "postprocess":  function(d){
            var value = d[0].src.replace(/(^")|("$)/g, "").replace(/\\"/g, "\"");
            return mkType(d, "String", value);
        } },
    {"name": "Docstring", "symbols": [tok_DOCSTRING], "postprocess":  function(d){
            var value = d[0].src.replace(/(^""")|("""$)/g, "").replace(/\\"/g, "\"");
            return mkType(d, "Docstring", value);
        } },
    {"name": "Identifier", "symbols": [tok_SYMBOL], "postprocess":  function(d, start, reject){
            var src = d[0].src;
            if(isReserved(src)){
                return reject;
            }
            return mkType(d, "Identifier", src);
        } },
    {"name": "Nil", "symbols": [tok_nil], "postprocess":  function(d){
            return {loc: d[0].loc, type: "Nil"};
        } },
    {"name": "Boolean$subexpression$1", "symbols": [tok_true]},
    {"name": "Boolean$subexpression$1", "symbols": [tok_false]},
    {"name": "Boolean", "symbols": ["Boolean$subexpression$1"], "postprocess":  function(d){
            var t = d[0][0];
            return {loc: t.loc, type: "Boolean", value: t.src === "true"};
        } },
    {"name": "Symbol", "symbols": [tok_SYMBOL], "postprocess":  function(d){
            return mkType(d, "Symbol", d[0].src);
        } },
    {"name": "INDENT", "symbols": [tok_INDENT], "postprocess": id},
    {"name": "DEDENT", "symbols": [tok_DEDENT], "postprocess": id},
    {"name": "COMMA", "symbols": [tok_COMMA], "postprocess": id},
    {"name": "NL", "symbols": [tok_NL], "postprocess": id}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();

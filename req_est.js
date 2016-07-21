module.exports = {
    "loc": {
        "start": {
            "line": 1,
            "column": 0
        },
        "end": {
            "line": 20,
            "column": 2
        }
    },
    "type": "Program",
    "body": [
        {
            "loc": {
                "start": {
                    "line": 1,
                    "column": 0
                },
                "end": {
                    "line": 20,
                    "column": 1
                }
            },
            "type": "FunctionDeclaration",
            "id": {
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 9
                    },
                    "end": {
                        "line": 1,
                        "column": 16
                    }
                },
                "type": "Identifier",
                "name": "require"
            },
            "params": [
                {
                    "loc": {
                        "start": {
                            "line": 1,
                            "column": 17
                        },
                        "end": {
                            "line": 1,
                            "column": 22
                        }
                    },
                    "type": "Identifier",
                    "name": "mdefs"
                },
                {
                    "loc": {
                        "start": {
                            "line": 1,
                            "column": 24
                        },
                        "end": {
                            "line": 1,
                            "column": 28
                        }
                    },
                    "type": "Identifier",
                    "name": "main"
                }
            ],
            "defaults": [],
            "body": {
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 29
                    },
                    "end": {
                        "line": 20,
                        "column": 1
                    }
                },
                "type": "BlockStatement",
                "body": [
                    {
                        "loc": {
                            "start": {
                                "line": 2,
                                "column": 2
                            },
                            "end": {
                                "line": 11,
                                "column": 4
                            }
                        },
                        "type": "VariableDeclaration",
                        "declarations": [
                            {
                                "loc": {
                                    "start": {
                                        "line": 2,
                                        "column": 6
                                    },
                                    "end": {
                                        "line": 11,
                                        "column": 3
                                    }
                                },
                                "type": "VariableDeclarator",
                                "id": {
                                    "loc": {
                                        "start": {
                                            "line": 2,
                                            "column": 6
                                        },
                                        "end": {
                                            "line": 2,
                                            "column": 16
                                        }
                                    },
                                    "type": "Identifier",
                                    "name": "loadModule"
                                },
                                "init": {
                                    "loc": {
                                        "start": {
                                            "line": 2,
                                            "column": 19
                                        },
                                        "end": {
                                            "line": 11,
                                            "column": 3
                                        }
                                    },
                                    "type": "FunctionExpression",
                                    "id": {
                                        "loc": {
                                            "start": {
                                                "line": 2,
                                                "column": 28
                                            },
                                            "end": {
                                                "line": 2,
                                                "column": 38
                                            }
                                        },
                                        "type": "Identifier",
                                        "name": "loadModule"
                                    },
                                    "params": [
                                        {
                                            "loc": {
                                                "start": {
                                                    "line": 2,
                                                    "column": 39
                                                },
                                                "end": {
                                                    "line": 2,
                                                    "column": 42
                                                }
                                            },
                                            "type": "Identifier",
                                            "name": "mid"
                                        }
                                    ],
                                    "defaults": [],
                                    "body": {
                                        "loc": {
                                            "start": {
                                                "line": 2,
                                                "column": 44
                                            },
                                            "end": {
                                                "line": 11,
                                                "column": 3
                                            }
                                        },
                                        "type": "BlockStatement",
                                        "body": [
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 3,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 3,
                                                        "column": 23
                                                    }
                                                },
                                                "type": "VariableDeclaration",
                                                "declarations": [
                                                    {
                                                        "loc": {
                                                            "start": {
                                                                "line": 3,
                                                                "column": 8
                                                            },
                                                            "end": {
                                                                "line": 3,
                                                                "column": 22
                                                            }
                                                        },
                                                        "type": "VariableDeclarator",
                                                        "id": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 3,
                                                                    "column": 8
                                                                },
                                                                "end": {
                                                                    "line": 3,
                                                                    "column": 9
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "m"
                                                        },
                                                        "init": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 3,
                                                                    "column": 12
                                                                },
                                                                "end": {
                                                                    "line": 3,
                                                                    "column": 22
                                                                }
                                                            },
                                                            "type": "MemberExpression",
                                                            "computed": true,
                                                            "object": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 3,
                                                                        "column": 12
                                                                    },
                                                                    "end": {
                                                                        "line": 3,
                                                                        "column": 17
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "mdefs"
                                                            },
                                                            "property": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 3,
                                                                        "column": 18
                                                                    },
                                                                    "end": {
                                                                        "line": 3,
                                                                        "column": 21
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "mid"
                                                            }
                                                        }
                                                    }
                                                ],
                                                "kind": "var"
                                            },
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 4,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 4,
                                                        "column": 18
                                                    }
                                                },
                                                "type": "VariableDeclaration",
                                                "declarations": [
                                                    {
                                                        "loc": {
                                                            "start": {
                                                                "line": 4,
                                                                "column": 8
                                                            },
                                                            "end": {
                                                                "line": 4,
                                                                "column": 17
                                                            }
                                                        },
                                                        "type": "VariableDeclarator",
                                                        "id": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 4,
                                                                    "column": 8
                                                                },
                                                                "end": {
                                                                    "line": 4,
                                                                    "column": 12
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "args"
                                                        },
                                                        "init": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 4,
                                                                    "column": 15
                                                                },
                                                                "end": {
                                                                    "line": 4,
                                                                    "column": 17
                                                                }
                                                            },
                                                            "type": "ArrayExpression",
                                                            "elements": []
                                                        }
                                                    }
                                                ],
                                                "kind": "var"
                                            },
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 5,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 5,
                                                        "column": 14
                                                    }
                                                },
                                                "type": "VariableDeclaration",
                                                "declarations": [
                                                    {
                                                        "loc": {
                                                            "start": {
                                                                "line": 5,
                                                                "column": 8
                                                            },
                                                            "end": {
                                                                "line": 5,
                                                                "column": 13
                                                            }
                                                        },
                                                        "type": "VariableDeclarator",
                                                        "id": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 5,
                                                                    "column": 8
                                                                },
                                                                "end": {
                                                                    "line": 5,
                                                                    "column": 9
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "i"
                                                        },
                                                        "init": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 5,
                                                                    "column": 12
                                                                },
                                                                "end": {
                                                                    "line": 5,
                                                                    "column": 13
                                                                }
                                                            },
                                                            "type": "Literal",
                                                            "value": 1,
                                                            "raw": "1"
                                                        }
                                                    }
                                                ],
                                                "kind": "var"
                                            },
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 6,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 9,
                                                        "column": 5
                                                    }
                                                },
                                                "type": "WhileStatement",
                                                "test": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 6,
                                                            "column": 11
                                                        },
                                                        "end": {
                                                            "line": 6,
                                                            "column": 23
                                                        }
                                                    },
                                                    "type": "BinaryExpression",
                                                    "operator": "<",
                                                    "left": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 6,
                                                                "column": 11
                                                            },
                                                            "end": {
                                                                "line": 6,
                                                                "column": 12
                                                            }
                                                        },
                                                        "type": "Identifier",
                                                        "name": "i"
                                                    },
                                                    "right": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 6,
                                                                "column": 15
                                                            },
                                                            "end": {
                                                                "line": 6,
                                                                "column": 23
                                                            }
                                                        },
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 6,
                                                                    "column": 15
                                                                },
                                                                "end": {
                                                                    "line": 6,
                                                                    "column": 16
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "m"
                                                        },
                                                        "property": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 6,
                                                                    "column": 17
                                                                },
                                                                "end": {
                                                                    "line": 6,
                                                                    "column": 23
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "length"
                                                        }
                                                    }
                                                },
                                                "body": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 6,
                                                            "column": 25
                                                        },
                                                        "end": {
                                                            "line": 9,
                                                            "column": 5
                                                        }
                                                    },
                                                    "type": "BlockStatement",
                                                    "body": [
                                                        {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 7,
                                                                    "column": 6
                                                                },
                                                                "end": {
                                                                    "line": 7,
                                                                    "column": 31
                                                                }
                                                            },
                                                            "type": "ExpressionStatement",
                                                            "expression": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 7,
                                                                        "column": 6
                                                                    },
                                                                    "end": {
                                                                        "line": 7,
                                                                        "column": 30
                                                                    }
                                                                },
                                                                "type": "CallExpression",
                                                                "callee": {
                                                                    "loc": {
                                                                        "start": {
                                                                            "line": 7,
                                                                            "column": 6
                                                                        },
                                                                        "end": {
                                                                            "line": 7,
                                                                            "column": 15
                                                                        }
                                                                    },
                                                                    "type": "MemberExpression",
                                                                    "computed": false,
                                                                    "object": {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 7,
                                                                                "column": 6
                                                                            },
                                                                            "end": {
                                                                                "line": 7,
                                                                                "column": 10
                                                                            }
                                                                        },
                                                                        "type": "Identifier",
                                                                        "name": "args"
                                                                    },
                                                                    "property": {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 7,
                                                                                "column": 11
                                                                            },
                                                                            "end": {
                                                                                "line": 7,
                                                                                "column": 15
                                                                            }
                                                                        },
                                                                        "type": "Identifier",
                                                                        "name": "push"
                                                                    }
                                                                },
                                                                "arguments": [
                                                                    {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 7,
                                                                                "column": 16
                                                                            },
                                                                            "end": {
                                                                                "line": 7,
                                                                                "column": 29
                                                                            }
                                                                        },
                                                                        "type": "CallExpression",
                                                                        "callee": {
                                                                            "loc": {
                                                                                "start": {
                                                                                    "line": 7,
                                                                                    "column": 16
                                                                                },
                                                                                "end": {
                                                                                    "line": 7,
                                                                                    "column": 23
                                                                                }
                                                                            },
                                                                            "type": "Identifier",
                                                                            "name": "require"
                                                                        },
                                                                        "arguments": [
                                                                            {
                                                                                "loc": {
                                                                                    "start": {
                                                                                        "line": 7,
                                                                                        "column": 24
                                                                                    },
                                                                                    "end": {
                                                                                        "line": 7,
                                                                                        "column": 28
                                                                                    }
                                                                                },
                                                                                "type": "MemberExpression",
                                                                                "computed": true,
                                                                                "object": {
                                                                                    "loc": {
                                                                                        "start": {
                                                                                            "line": 7,
                                                                                            "column": 24
                                                                                        },
                                                                                        "end": {
                                                                                            "line": 7,
                                                                                            "column": 25
                                                                                        }
                                                                                    },
                                                                                    "type": "Identifier",
                                                                                    "name": "m"
                                                                                },
                                                                                "property": {
                                                                                    "loc": {
                                                                                        "start": {
                                                                                            "line": 7,
                                                                                            "column": 26
                                                                                        },
                                                                                        "end": {
                                                                                            "line": 7,
                                                                                            "column": 27
                                                                                        }
                                                                                    },
                                                                                    "type": "Identifier",
                                                                                    "name": "i"
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        },
                                                        {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 8,
                                                                    "column": 6
                                                                },
                                                                "end": {
                                                                    "line": 8,
                                                                    "column": 10
                                                                }
                                                            },
                                                            "type": "ExpressionStatement",
                                                            "expression": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 8,
                                                                        "column": 6
                                                                    },
                                                                    "end": {
                                                                        "line": 8,
                                                                        "column": 9
                                                                    }
                                                                },
                                                                "type": "UpdateExpression",
                                                                "operator": "++",
                                                                "argument": {
                                                                    "loc": {
                                                                        "start": {
                                                                            "line": 8,
                                                                            "column": 6
                                                                        },
                                                                        "end": {
                                                                            "line": 8,
                                                                            "column": 7
                                                                        }
                                                                    },
                                                                    "type": "Identifier",
                                                                    "name": "i"
                                                                },
                                                                "prefix": false
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 10,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 10,
                                                        "column": 36
                                                    }
                                                },
                                                "type": "ReturnStatement",
                                                "argument": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 10,
                                                            "column": 11
                                                        },
                                                        "end": {
                                                            "line": 10,
                                                            "column": 35
                                                        }
                                                    },
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 10,
                                                                "column": 11
                                                            },
                                                            "end": {
                                                                "line": 10,
                                                                "column": 21
                                                            }
                                                        },
                                                        "type": "MemberExpression",
                                                        "computed": false,
                                                        "object": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 10,
                                                                    "column": 11
                                                                },
                                                                "end": {
                                                                    "line": 10,
                                                                    "column": 15
                                                                }
                                                            },
                                                            "type": "MemberExpression",
                                                            "computed": true,
                                                            "object": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 10,
                                                                        "column": 11
                                                                    },
                                                                    "end": {
                                                                        "line": 10,
                                                                        "column": 12
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "m"
                                                            },
                                                            "property": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 10,
                                                                        "column": 13
                                                                    },
                                                                    "end": {
                                                                        "line": 10,
                                                                        "column": 14
                                                                    }
                                                                },
                                                                "type": "Literal",
                                                                "value": 0,
                                                                "raw": "0"
                                                            }
                                                        },
                                                        "property": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 10,
                                                                    "column": 16
                                                                },
                                                                "end": {
                                                                    "line": 10,
                                                                    "column": 21
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "apply"
                                                        }
                                                    },
                                                    "arguments": [
                                                        {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 10,
                                                                    "column": 22
                                                                },
                                                                "end": {
                                                                    "line": 10,
                                                                    "column": 28
                                                                }
                                                            },
                                                            "type": "UnaryExpression",
                                                            "operator": "void",
                                                            "argument": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 10,
                                                                        "column": 27
                                                                    },
                                                                    "end": {
                                                                        "line": 10,
                                                                        "column": 28
                                                                    }
                                                                },
                                                                "type": "Literal",
                                                                "value": 0,
                                                                "raw": "0"
                                                            },
                                                            "prefix": true
                                                        },
                                                        {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 10,
                                                                    "column": 30
                                                                },
                                                                "end": {
                                                                    "line": 10,
                                                                    "column": 34
                                                                }
                                                            },
                                                            "type": "Identifier",
                                                            "name": "args"
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    },
                                    "generator": false,
                                    "expression": false
                                }
                            }
                        ],
                        "kind": "var"
                    },
                    {
                        "loc": {
                            "start": {
                                "line": 12,
                                "column": 2
                            },
                            "end": {
                                "line": 12,
                                "column": 17
                            }
                        },
                        "type": "VariableDeclaration",
                        "declarations": [
                            {
                                "loc": {
                                    "start": {
                                        "line": 12,
                                        "column": 6
                                    },
                                    "end": {
                                        "line": 12,
                                        "column": 16
                                    }
                                },
                                "type": "VariableDeclarator",
                                "id": {
                                    "loc": {
                                        "start": {
                                            "line": 12,
                                            "column": 6
                                        },
                                        "end": {
                                            "line": 12,
                                            "column": 11
                                        }
                                    },
                                    "type": "Identifier",
                                    "name": "cache"
                                },
                                "init": {
                                    "loc": {
                                        "start": {
                                            "line": 12,
                                            "column": 14
                                        },
                                        "end": {
                                            "line": 12,
                                            "column": 16
                                        }
                                    },
                                    "type": "ObjectExpression",
                                    "properties": []
                                }
                            }
                        ],
                        "kind": "var"
                    },
                    {
                        "loc": {
                            "start": {
                                "line": 13,
                                "column": 2
                            },
                            "end": {
                                "line": 18,
                                "column": 4
                            }
                        },
                        "type": "VariableDeclaration",
                        "declarations": [
                            {
                                "loc": {
                                    "start": {
                                        "line": 13,
                                        "column": 6
                                    },
                                    "end": {
                                        "line": 18,
                                        "column": 3
                                    }
                                },
                                "type": "VariableDeclarator",
                                "id": {
                                    "loc": {
                                        "start": {
                                            "line": 13,
                                            "column": 6
                                        },
                                        "end": {
                                            "line": 13,
                                            "column": 13
                                        }
                                    },
                                    "type": "Identifier",
                                    "name": "require"
                                },
                                "init": {
                                    "loc": {
                                        "start": {
                                            "line": 13,
                                            "column": 16
                                        },
                                        "end": {
                                            "line": 18,
                                            "column": 3
                                        }
                                    },
                                    "type": "FunctionExpression",
                                    "id": null,
                                    "params": [
                                        {
                                            "loc": {
                                                "start": {
                                                    "line": 13,
                                                    "column": 25
                                                },
                                                "end": {
                                                    "line": 13,
                                                    "column": 28
                                                }
                                            },
                                            "type": "Identifier",
                                            "name": "mid"
                                        }
                                    ],
                                    "defaults": [],
                                    "body": {
                                        "loc": {
                                            "start": {
                                                "line": 13,
                                                "column": 29
                                            },
                                            "end": {
                                                "line": 18,
                                                "column": 3
                                            }
                                        },
                                        "type": "BlockStatement",
                                        "body": [
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 14,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 16,
                                                        "column": 5
                                                    }
                                                },
                                                "type": "IfStatement",
                                                "test": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 14,
                                                            "column": 7
                                                        },
                                                        "end": {
                                                            "line": 14,
                                                            "column": 33
                                                        }
                                                    },
                                                    "type": "UnaryExpression",
                                                    "operator": "!",
                                                    "argument": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 14,
                                                                "column": 8
                                                            },
                                                            "end": {
                                                                "line": 14,
                                                                "column": 33
                                                            }
                                                        },
                                                        "type": "CallExpression",
                                                        "callee": {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 14,
                                                                    "column": 8
                                                                },
                                                                "end": {
                                                                    "line": 14,
                                                                    "column": 28
                                                                }
                                                            },
                                                            "type": "MemberExpression",
                                                            "computed": false,
                                                            "object": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 14,
                                                                        "column": 8
                                                                    },
                                                                    "end": {
                                                                        "line": 14,
                                                                        "column": 13
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "cache"
                                                            },
                                                            "property": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 14,
                                                                        "column": 14
                                                                    },
                                                                    "end": {
                                                                        "line": 14,
                                                                        "column": 28
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "hasOwnProperty"
                                                            }
                                                        },
                                                        "arguments": [
                                                            {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 14,
                                                                        "column": 29
                                                                    },
                                                                    "end": {
                                                                        "line": 14,
                                                                        "column": 32
                                                                    }
                                                                },
                                                                "type": "Identifier",
                                                                "name": "mid"
                                                            }
                                                        ]
                                                    },
                                                    "prefix": true
                                                },
                                                "consequent": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 14,
                                                            "column": 34
                                                        },
                                                        "end": {
                                                            "line": 16,
                                                            "column": 5
                                                        }
                                                    },
                                                    "type": "BlockStatement",
                                                    "body": [
                                                        {
                                                            "loc": {
                                                                "start": {
                                                                    "line": 15,
                                                                    "column": 6
                                                                },
                                                                "end": {
                                                                    "line": 15,
                                                                    "column": 35
                                                                }
                                                            },
                                                            "type": "ExpressionStatement",
                                                            "expression": {
                                                                "loc": {
                                                                    "start": {
                                                                        "line": 15,
                                                                        "column": 6
                                                                    },
                                                                    "end": {
                                                                        "line": 15,
                                                                        "column": 34
                                                                    }
                                                                },
                                                                "type": "AssignmentExpression",
                                                                "operator": "=",
                                                                "left": {
                                                                    "loc": {
                                                                        "start": {
                                                                            "line": 15,
                                                                            "column": 6
                                                                        },
                                                                        "end": {
                                                                            "line": 15,
                                                                            "column": 16
                                                                        }
                                                                    },
                                                                    "type": "MemberExpression",
                                                                    "computed": true,
                                                                    "object": {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 15,
                                                                                "column": 6
                                                                            },
                                                                            "end": {
                                                                                "line": 15,
                                                                                "column": 11
                                                                            }
                                                                        },
                                                                        "type": "Identifier",
                                                                        "name": "cache"
                                                                    },
                                                                    "property": {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 15,
                                                                                "column": 12
                                                                            },
                                                                            "end": {
                                                                                "line": 15,
                                                                                "column": 15
                                                                            }
                                                                        },
                                                                        "type": "Identifier",
                                                                        "name": "mid"
                                                                    }
                                                                },
                                                                "right": {
                                                                    "loc": {
                                                                        "start": {
                                                                            "line": 15,
                                                                            "column": 19
                                                                        },
                                                                        "end": {
                                                                            "line": 15,
                                                                            "column": 34
                                                                        }
                                                                    },
                                                                    "type": "CallExpression",
                                                                    "callee": {
                                                                        "loc": {
                                                                            "start": {
                                                                                "line": 15,
                                                                                "column": 19
                                                                            },
                                                                            "end": {
                                                                                "line": 15,
                                                                                "column": 29
                                                                            }
                                                                        },
                                                                        "type": "Identifier",
                                                                        "name": "loadModule"
                                                                    },
                                                                    "arguments": [
                                                                        {
                                                                            "loc": {
                                                                                "start": {
                                                                                    "line": 15,
                                                                                    "column": 30
                                                                                },
                                                                                "end": {
                                                                                    "line": 15,
                                                                                    "column": 33
                                                                                }
                                                                            },
                                                                            "type": "Identifier",
                                                                            "name": "mid"
                                                                        }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    ]
                                                },
                                                "alternate": null
                                            },
                                            {
                                                "loc": {
                                                    "start": {
                                                        "line": 17,
                                                        "column": 4
                                                    },
                                                    "end": {
                                                        "line": 17,
                                                        "column": 22
                                                    }
                                                },
                                                "type": "ReturnStatement",
                                                "argument": {
                                                    "loc": {
                                                        "start": {
                                                            "line": 17,
                                                            "column": 11
                                                        },
                                                        "end": {
                                                            "line": 17,
                                                            "column": 21
                                                        }
                                                    },
                                                    "type": "MemberExpression",
                                                    "computed": true,
                                                    "object": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 17,
                                                                "column": 11
                                                            },
                                                            "end": {
                                                                "line": 17,
                                                                "column": 16
                                                            }
                                                        },
                                                        "type": "Identifier",
                                                        "name": "cache"
                                                    },
                                                    "property": {
                                                        "loc": {
                                                            "start": {
                                                                "line": 17,
                                                                "column": 17
                                                            },
                                                            "end": {
                                                                "line": 17,
                                                                "column": 20
                                                            }
                                                        },
                                                        "type": "Identifier",
                                                        "name": "mid"
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    "generator": false,
                                    "expression": false
                                }
                            }
                        ],
                        "kind": "var"
                    },
                    {
                        "loc": {
                            "start": {
                                "line": 19,
                                "column": 2
                            },
                            "end": {
                                "line": 19,
                                "column": 23
                            }
                        },
                        "type": "ReturnStatement",
                        "argument": {
                            "loc": {
                                "start": {
                                    "line": 19,
                                    "column": 9
                                },
                                "end": {
                                    "line": 19,
                                    "column": 22
                                }
                            },
                            "type": "CallExpression",
                            "callee": {
                                "loc": {
                                    "start": {
                                        "line": 19,
                                        "column": 9
                                    },
                                    "end": {
                                        "line": 19,
                                        "column": 16
                                    }
                                },
                                "type": "Identifier",
                                "name": "require"
                            },
                            "arguments": [
                                {
                                    "loc": {
                                        "start": {
                                            "line": 19,
                                            "column": 17
                                        },
                                        "end": {
                                            "line": 19,
                                            "column": 21
                                        }
                                    },
                                    "type": "Identifier",
                                    "name": "main"
                                }
                            ]
                        }
                    }
                ]
            },
            "generator": false,
            "expression": false
        },
        {
            "loc": {
                "start": {
                    "line": 20,
                    "column": 1
                },
                "end": {
                    "line": 20,
                    "column": 2
                }
            },
            "type": "EmptyStatement"
        }
    ],
    "sourceType": "script"
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbols = void 0;
exports.symbols = [
    {
        "name": "Zip",
        "kind": "method",
        "type": "Boolean",
        "isShared": true,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pSourceFile",
                "type": "String",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pZipFile",
                "type": "String",
                "isByRef": false,
                "isOptional": false
            }
        ],
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "ZipFile",
        "description": "Compacta um arquivo."
    },
    {
        "name": "Unzip",
        "kind": "method",
        "type": "Boolean",
        "isShared": true,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pZipFile",
                "type": "String",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pDestDir",
                "type": "String",
                "isByRef": false,
                "isOptional": false
            }
        ],
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "ZipFile",
        "description": "Descompacta um arquivo."
    }
];
//# sourceMappingURL=ZipFile.js.map
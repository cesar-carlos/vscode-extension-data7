"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbols = void 0;
exports.symbols = [
    {
        "name": "TStringList",
        "kind": "class",
        "type": "TStringList",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes",
        "inheritsFrom": "System.Classes.TStrings",
        "description": "Classe de lista de strings de uso geral que estende TStrings, oferecendo ordenação e busca eficiente."
    },
    {
        "name": "Find",
        "kind": "method",
        "type": "Boolean",
        "isShared": false,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pText",
                "type": "String",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pIndex",
                "type": "Integer",
                "isByRef": true,
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
        "containerName": "System.Classes.TStringList",
        "description": "Busca uma string na lista ordenada e retorna true se encontrada, preenchendo o índice em pIndex."
    },
    {
        "name": "Sort",
        "kind": "method",
        "type": "Void",
        "isShared": false,
        "isPrivate": false,
        "parameters": [],
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes.TStringList",
        "description": "Ordena os itens da lista em ordem ascendente."
    },
    {
        "name": "CustomSort",
        "kind": "method",
        "type": "Void",
        "isShared": false,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pCompare",
                "type": "TObject",
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
        "containerName": "System.Classes.TStringList",
        "description": "Ordena os itens da lista usando um método customizado de comparação de objetos/strings."
    },
    {
        "name": "CaseSensitive",
        "kind": "property",
        "type": "Boolean",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes.TStringList",
        "description": "Especifica se as buscas e comparações diferenciam maiúsculas de minúsculas."
    },
    {
        "name": "Duplicates",
        "kind": "property",
        "type": "String",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes.TStringList",
        "description": "Controla a política de inserção de duplicatas (ex: dupIgnore, dupAccept, dupError)."
    },
    {
        "name": "Sorted",
        "kind": "property",
        "type": "Boolean",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes.TStringList",
        "description": "Especifica se a lista deve manter os elementos automaticamente ordenados."
    },
    {
        "name": "OwnsObjects",
        "kind": "property",
        "type": "Boolean",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "System.Classes.TStringList",
        "description": "Especifica se a lista deve liberar a memória dos objetos contidos ao limpá-la ou remover itens."
    }
];
//# sourceMappingURL=TStringList.js.map
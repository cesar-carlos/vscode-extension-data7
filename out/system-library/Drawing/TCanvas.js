"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbols = void 0;
exports.symbols = [
    {
        "name": "TCanvas",
        "kind": "class",
        "type": "TCanvas",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "Drawing",
        "inheritsFrom": "TObject",
        "description": "Representa a área de desenho de um componente gráfico."
    },
    {
        "name": "Pen",
        "kind": "property",
        "type": "TPen",
        "isShared": false,
        "isPrivate": false,
        "range": {
            "startLine": 0,
            "startChar": 0,
            "endLine": 0,
            "endChar": 0
        },
        "fileUri": "system://library",
        "containerName": "TCanvas",
        "description": "Obtém ou define as configurações da caneta de contorno."
    },
    {
        "name": "MoveTo",
        "kind": "method",
        "type": "Void",
        "isShared": false,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pX",
                "type": "Integer",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pY",
                "type": "Integer",
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
        "containerName": "TCanvas",
        "description": "Move a posição atual da caneta para as coordenadas informadas."
    },
    {
        "name": "Rectangle",
        "kind": "method",
        "type": "Void",
        "isShared": false,
        "isPrivate": false,
        "parameters": [
            {
                "name": "pX1",
                "type": "Integer",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pY1",
                "type": "Integer",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pX2",
                "type": "Integer",
                "isByRef": false,
                "isOptional": false
            },
            {
                "name": "pY2",
                "type": "Integer",
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
        "containerName": "TCanvas",
        "description": "Desenha um retângulo no canvas utilizando a caneta ativa."
    }
];
//# sourceMappingURL=TCanvas.js.map
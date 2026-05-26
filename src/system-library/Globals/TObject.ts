import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "TObject",
    "kind": "class",
    "type": "TObject",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "inheritsFrom": "System.Classes.TObject",
    "description": "Classe base para todos os objetos no ambiente Data7/Delphi."
  },
  {
    "name": "ToString",
    "kind": "method",
    "type": "String",
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
    "containerName": "TObject",
    "description": "Retorna a representação textual do objeto."
  },
  {
    "name": "Free",
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
    "containerName": "TObject",
    "description": "Libera a memória alocada pelo objeto (Destrutor nativo Delphi)."
  },
  {
    "name": "GetHashCode",
    "kind": "method",
    "type": "Integer",
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
    "containerName": "TObject",
    "description": "Retorna o código hash do objeto (identificador único no ecossistema Delphi)."
  },
  {
    "name": "ClassName",
    "kind": "method",
    "type": "String",
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
    "containerName": "TObject",
    "description": "Retorna o nome da classe do objeto como uma string."
  },
  {
    "name": "ClassNameIs",
    "kind": "method",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pName",
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
    "containerName": "TObject",
    "description": "Verifica se o nome da classe do objeto é igual ao nome fornecido."
  },
  {
    "name": "ClassParent",
    "kind": "method",
    "type": "TObject",
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
    "containerName": "TObject",
    "description": "Retorna a classe pai direto da classe deste objeto."
  },
  {
    "name": "InheritsFrom",
    "kind": "method",
    "type": "Boolean",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pClass",
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
    "containerName": "TObject",
    "description": "Verifica se a classe do objeto herda de uma determinada classe."
  },
  {
    "name": "DisposeOf",
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
    "containerName": "TObject",
    "description": "Libera a memória e destrói o objeto se ele tiver sido criado dinamicamente."
  }
];

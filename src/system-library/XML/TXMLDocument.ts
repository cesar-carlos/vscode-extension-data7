import { SystemSymbolInfo } from "../types";

export const symbols: SystemSymbolInfo[] = [
  {
    "name": "TXMLDocument",
    "kind": "class",
    "type": "XML.TXMLDocument",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "XML",
    "inheritsFrom": "TObject",
    "description": "Representa um documento XML que pode ser lido, manipulado e salvo."
  },
  {
    "name": "Active",
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
    "containerName": "TXMLDocument",
    "description": "Ativa ou desativa a manipulação do documento XML."
  },
  {
    "name": "FileName",
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
    "containerName": "TXMLDocument",
    "description": "Caminho/nome do arquivo XML físico."
  },
  {
    "name": "DocumentElement",
    "kind": "property",
    "type": "XML.IXMLNode",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "TXMLDocument",
    "description": "Nó raiz (elemento principal) do documento XML."
  },
  {
    "name": "Node",
    "kind": "property",
    "type": "XML.IXMLNode",
    "isShared": false,
    "isPrivate": false,
    "range": {
      "startLine": 0,
      "startChar": 0,
      "endLine": 0,
      "endChar": 0
    },
    "fileUri": "system://library",
    "containerName": "TXMLDocument",
    "description": "Nó base associado ao documento XML."
  },
  {
    "name": "LoadFromFile",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pFileName",
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
    "containerName": "TXMLDocument",
    "description": "Carrega o documento XML a partir de um arquivo físico."
  },
  {
    "name": "SaveToFile",
    "kind": "method",
    "type": "Void",
    "isShared": false,
    "isPrivate": false,
    "parameters": [
      {
        "name": "pFileName",
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
    "containerName": "TXMLDocument",
    "description": "Salva o conteúdo XML modificado no arquivo especificado."
  }
];
